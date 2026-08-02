# Phoenix Family Calendar Integration

## Purpose

Meal planning may suggest a family meal time, but it must not silently modify an external calendar.

## Flow

1. Start from an approved meal.
2. Evaluate participant availability windows.
3. Produce a schedule proposal.
4. Block approval while conflicts remain.
5. Approve the internal schedule proposal.
6. Create a separate external calendar-write request.
7. Require an explicit decision on that write request.
8. Record the external event identifier after execution.

## Safety boundary

- A meal recommendation is not calendar authorization.
- A schedule proposal is not an external write.
- Conflicting schedules remain drafts.
- External calendar changes require explicit approval.
- Execution must remain traceable to the proposal, requester, decision maker, and external event identifier.

## Current status

The domain contract and acceptance fixture exist. No external calendar provider call is performed by this module yet.
