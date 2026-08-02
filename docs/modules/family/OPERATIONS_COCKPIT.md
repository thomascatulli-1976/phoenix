# Phoenix Family Operations Cockpit

The operations cockpit provides one governed lifecycle for consequential Phoenix Family actions.

## Covered operation kinds

- meal plan approval
- calendar write
- shopping execution
- child kitchen task
- chore assignment
- leftover reuse

## Lifecycle

`proposed -> awaiting-approval -> approved/rejected -> executing -> completed/failed`

## Governance rules

1. Operations identify household, subject, requester and timestamps.
2. Approval requirements and approval roles are explicit.
3. Requesters cannot approve their own consequential operation.
4. Admins may satisfy an approval role but do not bypass the self-approval rule.
5. External execution starts only after approval.
6. Completion may store an external reference.
7. Every transition creates an append-only audit entry.
8. Failures require a reason and remain visible in the audit trail.

## Acceptance coverage

`fixtures/operations-acceptance.ts` demonstrates a shopping execution request in which:

- the requester submits the operation;
- self-approval is blocked;
- another household member with the shopper role approves it;
- the runtime starts execution;
- the external order reference is stored on completion;
- the complete transition sequence remains auditable.
