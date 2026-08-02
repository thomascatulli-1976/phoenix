# Phoenix Family Leftover Reuse v0.1

## Purpose

Reduce food waste by turning approved, still-safe leftovers into explicit future meal options.

## Lifecycle

`available -> reserved -> consumed`

Alternative terminal state: `discarded`.

## Rules

1. Expired leftovers are blocked.
2. A batch requires positive portions, ingredients, storage data, and a use-by date.
3. Reuse is proposed, not executed automatically.
4. Reservation requires explicit approval.
5. Reheating and visual/sensory checks are always shown as safety notes.
6. Refrigerator batches receive stronger urgency guidance as the use-by date approaches.
7. Consumption clears the remaining portion count.
8. Leftover reuse does not create autonomous calendar, purchase, messaging, or appliance actions.

## Traceability

Every reuse option references its source leftover batch, which references the original meal-plan entry. This preserves the path from approved plan to cooking session to stored remainder to later reuse.
