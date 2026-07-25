export const PHOENIX_PLATFORM = 'Phoenix One' as const;
export const PDOS_RUNTIME_MODE = 'development' as const;

export type AuthorityOutcome =
  | 'approve'
  | 'approve_with_constraints'
  | 'reject'
  | 'block'
  | 'wait'
  | 'escalate'
  | 'request_evidence'
  | 'defer'
  | 'cancel'
  | 'replace';

export interface AuthorityContext {
  readonly environment: 'development' | 'test' | 'shadow' | 'paper-production';
  readonly domain: 'sports' | 'trading' | 'research' | 'coach' | 'scout';
  readonly traceId: string;
  readonly correlationId: string;
  readonly activeMandateId?: string;
}

export function assertNoImplicitAuthority(context: AuthorityContext): void {
  if (!context.traceId || !context.correlationId) {
    throw new Error('Authority context requires trace and correlation identifiers.');
  }
}
