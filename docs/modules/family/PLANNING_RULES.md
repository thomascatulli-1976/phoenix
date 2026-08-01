# Phoenix Family Planning Rules v0.1

## Purpose

Define deterministic rules for converting Family Core context into a recommended shared meal, member-specific variants, a Thermomix workflow, and a consolidated shopping list.

## Priority order

1. Safety and explicit strict constraints
2. Guardian-governed child requirements
3. Granted consent and visibility boundaries
4. Shared base meal feasibility
5. Available time and equipment
6. Pantry and refrigerator availability
7. Avoidance constraints
8. Preferences and learned feedback
9. Cost and leftover optimization

A lower-priority rule may never override a higher-priority rule.

## Constraint resolution

- Strict constraints remove conflicting ingredients from a member variant.
- If removal eliminates the viable meal base for any active member, the candidate is blocked.
- Avoidance constraints create a variant and reduce candidate score.
- Preference conflicts reduce score but do not block a candidate.
- Constraints without granted consent are excluded from planning.
- Unresolved strict conflicts return no recommendation and require human resolution.

## Shared-base principle

The planner should maximize the common base and minimize separate cooking. A variant may add, remove, or substitute ingredients, but the system must expose every difference before approval.

## Approval boundary

Meal recommendations may be generated automatically. A meal must be explicitly approved before a CookingSession can be created. Purchases, messages, calendar changes, and external appliance actions remain separately approval-gated.

## Thermomix execution boundary

Before execution, the system must know the Thermomix model and validate:

- continuous step order
- non-empty instructions and expected results
- valid time, temperature, and speed values
- vessel and measuring-cup compatibility
- safety notes for relevant high-temperature steps
- explicit approval of the related meal plan entry

Unknown device capabilities must fail closed.

## Traceability

Every MealPlanEntry records the constraint identifiers applied to the decision. Shopping items record all source meals. Cooking sessions reference the approved MealPlanEntry.

## Current limitations

- Ingredient conflict matching is deterministic label and identifier matching.
- Automatic substitutions are not yet implemented.
- Nutritional computation is not yet implemented.
- Recipe candidates must be supplied by an approved recipe source.
- Medical context is treated only as a user-provided planning constraint, never as diagnosis or treatment.
