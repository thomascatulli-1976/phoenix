# Phoenix Family Vertical Slice Acceptance v0.1

## Purpose

This document defines the minimum executable acceptance criteria for the first Phoenix Family vertical slice: household context to approved Thermomix-guided cooking.

## Required checks

1. The demo household satisfies Family Core invariants.
2. A weekly meal request can reach `ready-for-approval`.
3. A vegetarian-compatible shared base meal is preferred over a conflicting meat candidate.
4. A lower-carbohydrate member variant removes potato from the selected base meal.
5. Missing pantry ingredients produce a consolidated shopping list.
6. An unapproved meal cannot be compiled into Thermomix steps.
7. An approved TM6 recipe compiles without validation errors.
8. A guided cooking session can start from the compiled steps.
9. Repeated valid step completion reaches the terminal `completed` state.

## Safety boundary

The acceptance fixture validates planning and guided workflow behavior only. It does not authorize autonomous purchasing, calendar mutation, messaging, medical treatment, or direct appliance control.

## Execution dependency

The checks are exposed through `runFamilyAcceptanceChecks` and `assertFamilyAcceptance`. Automated execution in CI depends on the TypeScript engineering baseline currently maintained in the separate PDOS foundation pull request.
