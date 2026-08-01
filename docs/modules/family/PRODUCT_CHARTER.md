# Phoenix Family Product Charter v0.1

## Ownership

- Executive Owner: Billy, Phoenix Executive Office
- Product area: Phoenix Family
- Governance path: Death Star -> Darth Vader -> Phoenix Executive Office -> Billy
- Canonical governance and architecture source: Google Drive
- Canonical executable source: GitHub

## Mission

Phoenix Family reduces the mental and organizational load of family life through coordinated companions that understand household context, prepare decisions, and translate approved decisions into safe, traceable actions.

## First Product

The first vertical slice is the Thermomix & Cooking Companion. It plans family meals, adapts a shared base meal to individual needs, prepares shopping lists, guides beginners step by step, and learns from taste, acceptance, leftovers, and tolerance feedback.

## Product Principles

1. One family context, multiple specialized companions.
2. Shared meals before separate meals.
3. Recommendations must become executable plans.
4. Human approval is required for sensitive or external actions.
5. Health information personalizes support but does not create diagnoses or replace medical care.
6. Child-related functionality is parent-governed and age-appropriate.
7. Every material decision and action must be traceable.
8. Data minimization and explicit permissions are mandatory.

## Scope

### Family Core

Shared household model for members, roles, preferences, dietary constraints, routines, schedules, tasks, inventory, budgets, goals, permissions, and learning signals.

### Thermomix & Cooking Companion

- household onboarding
- Thermomix model profile
- pantry and refrigerator capture
- weekly meal planning
- shared base meals with member variants
- shopping list generation
- guided Thermomix cooking mode
- leftover reuse
- taste and tolerance feedback

### Later Modules

- Household Companion
- Family Calendar Companion
- Kids Companion
- Family Finance Companion

## Explicit Non-Goals for MVP

- medical diagnosis or treatment
- autonomous food purchasing
- autonomous calendar changes without approval
- direct child access without guardian controls
- unrestricted external device control
- automatic nutritional promises or guaranteed health outcomes

## MVP Success Criteria

- a complete household can be onboarded
- a seven-day plan can be generated from constraints and availability
- at least one shared meal can produce multiple family variants
- a consolidated shopping list can be generated
- a beginner can complete a Thermomix recipe in guided mode
- feedback changes later recommendations
- every recommendation records its source constraints and approval state

## Delivery Sequence

1. Family Core contracts and permissions
2. Meal-planning domain model
3. Thermomix instruction model
4. Planning and variant engine
5. Guided cooking session
6. Feedback and learning loop
7. Calendar, shopping, and device integrations behind explicit approvals

## Traceability

Architecture-relevant changes must reference an approved Google Drive artifact. Executable changes, tests, and CI evidence remain in GitHub.