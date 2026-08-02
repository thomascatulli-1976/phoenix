# Family Core

Family Core is the shared context and policy layer for all Phoenix Family companions.

## Core entities

- Household
- HouseholdMember
- GuardianRelationship
- Preference
- DietaryConstraint
- HealthContext
- Routine
- Task
- CalendarConstraint
- InventoryItem
- BudgetConstraint
- Goal
- Consent
- Permission
- Recommendation
- Approval
- FeedbackSignal

## Required properties

Every sensitive fact must include provenance, owner, visibility, consent status, confidence, and last-updated metadata.

## Permission model

- adult self-service data
- guardian-managed child data
- household-shared data
- private member data
- companion-specific access grants
- external-action approval grants

## Safety rules

Health context may constrain recommendations but must not be interpreted as diagnosis or treatment. Child data and interactions require guardian control. Sensitive data must be minimized and compartmentalized.