# Phoenix Family Weekly Planning Flow v0.1

## Objective

Convert household context into a seven-day meal plan, resolve member constraints, generate a consolidated shopping list, and require human approval before execution.

## Flow

1. Validate the Family Context snapshot.
2. Read active household members and consented dietary constraints.
3. Assess recipe candidates for each requested meal slot.
4. Reject candidates that cannot preserve a viable meal for a member with strict constraints.
5. Prefer shared base meals and create member-specific variants only where necessary.
6. Aggregate missing ingredients into one shopping list.
7. Mark a complete conflict-free week as ready for approval.
8. Record the approving or rejecting household member.
9. Permit cooking-session creation only from approved meal entries.

## Constraint priority

1. strict allergy, intolerance, or medical-context constraint
2. explicit avoid constraint
3. available preparation time
4. ingredient availability
5. stated preference or dislike
6. convenience and reduced separate cooking

No preference may override a strict constraint.

## Approval boundary

Planning and recommendation are automatic. The following remain approval-gated:

- accepting the weekly plan
- starting an executable cooking session
- purchasing or ordering ingredients
- writing calendar events
- sending messages to household members
- controlling an external appliance

## Failure behavior

When no candidate satisfies active strict constraints, Phoenix Family returns a structured conflict rather than silently weakening the constraint. The user must select a new candidate, modify the plan, or explicitly update the underlying household data.

## Traceability

Every meal entry records the constraint IDs used in its assessment. Every approval records requester, decision maker, timestamps, covered meal IDs, and an optional decision reason.
