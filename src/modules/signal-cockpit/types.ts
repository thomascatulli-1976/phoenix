export type Health = 'green' | 'yellow' | 'red';

export interface ProductStatus {
  id: string;
  name: string;
  owner: 'Billy';
  status: string;
  health: Health;
  nextDeliverable: string;
  blockers: string[];
}

export interface ExecutiveCockpitSnapshot {
  generatedAt: string;
  executiveOffice: {
    name: 'Billy';
    reportsTo: 'Darth Vader';
    ultimateAuthority: 'Death Star';
  };
  overallHealth: Health;
  products: ProductStatus[];
  unresolvedBlockers: number;
  synchronization: {
    target: 'Death Star';
    upstream: 'Darth Vader';
    failClosed: true;
    ready: boolean;
  };
}
