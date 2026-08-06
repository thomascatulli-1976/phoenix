export type ModuleHealth = 'healthy' | 'degraded' | 'unavailable';

export interface PhoenixModule {
  id: string;
  name: string;
  version: string;
  capabilities: string[];
  initialize(): Promise<void>;
  shutdown(): Promise<void>;
  health(): Promise<ModuleHealth>;
}

export interface PhoenixEvent<T = unknown> {
  type: string;
  source: string;
  occurredAt: string;
  payload: T;
}

export interface PhoenixTask {
  id: string;
  title: string;
  moduleId: string;
  priority: number;
  status: 'open' | 'in-progress' | 'blocked' | 'done';
}

type EventHandler = (event: PhoenixEvent) => void | Promise<void>;

export class EventBus {
  private readonly handlers = new Map<string, Set<EventHandler>>();

  subscribe(type: string, handler: EventHandler): () => void {
    const group = this.handlers.get(type) ?? new Set<EventHandler>();
    group.add(handler);
    this.handlers.set(type, group);
    return () => group.delete(handler);
  }

  async publish(event: PhoenixEvent): Promise<void> {
    const handlers = [
      ...(this.handlers.get(event.type) ?? []),
      ...(this.handlers.get('*') ?? [])
    ];
    await Promise.all(handlers.map((handler) => handler(event)));
  }
}

export class StateStore {
  readonly moduleHealth = new Map<string, ModuleHealth>();
  readonly tasks = new Map<string, PhoenixTask>();
  readonly events: PhoenixEvent[] = [];
}

export class TaskEngine {
  constructor(private readonly state: StateStore) {}

  add(task: PhoenixTask): void {
    if (this.state.tasks.has(task.id)) throw new Error(`Task already exists: ${task.id}`);
    this.state.tasks.set(task.id, task);
  }

  next(): PhoenixTask | undefined {
    return [...this.state.tasks.values()]
      .filter((task) => task.status === 'open')
      .sort((a, b) => b.priority - a.priority)[0];
  }
}

export class ModuleRegistry {
  private readonly modules = new Map<string, PhoenixModule>();

  register(module: PhoenixModule): void {
    if (this.modules.has(module.id)) throw new Error(`Module already registered: ${module.id}`);
    this.modules.set(module.id, module);
  }

  list(): PhoenixModule[] {
    return [...this.modules.values()];
  }
}

export class BillyRuntime {
  readonly events = new EventBus();
  readonly state = new StateStore();
  readonly tasks = new TaskEngine(this.state);
  readonly registry = new ModuleRegistry();

  constructor(
    readonly name = 'Billy',
    readonly reportsTo = 'Darth Vader',
    readonly ultimateAuthority = 'Death Star'
  ) {
    this.events.subscribe('*', (event) => {
      this.state.events.push(event);
    });
  }

  register(module: PhoenixModule): void {
    this.registry.register(module);
  }

  async start(): Promise<void> {
    for (const module of this.registry.list()) {
      await module.initialize();
      this.state.moduleHealth.set(module.id, await module.health());
    }
    await this.events.publish({
      type: 'Billy.RuntimeStarted',
      source: 'billy',
      occurredAt: new Date().toISOString(),
      payload: { modules: this.registry.list().map((module) => module.id) }
    });
  }

  async refreshHealth(): Promise<Record<string, ModuleHealth>> {
    const snapshot: Record<string, ModuleHealth> = {};
    for (const module of this.registry.list()) {
      const health = await module.health();
      this.state.moduleHealth.set(module.id, health);
      snapshot[module.id] = health;
    }
    return snapshot;
  }

  dashboard() {
    return {
      executiveOffice: this.name,
      reportsTo: this.reportsTo,
      ultimateAuthority: this.ultimateAuthority,
      modules: this.registry.list().map((module) => ({
        id: module.id,
        name: module.name,
        version: module.version,
        health: this.state.moduleHealth.get(module.id) ?? 'unavailable'
      })),
      openTasks: [...this.state.tasks.values()].filter((task) => task.status !== 'done'),
      eventCount: this.state.events.length
    };
  }
}
