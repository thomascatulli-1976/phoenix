# Household Chores

Phoenix Family models household chores as governed assignments rather than silent automation.

## Rules

- Every chore declares area, duration, recurrence, risk level, and allowed age bands.
- Assignments outside the allowed age band are rejected.
- Medium- and high-risk chores assigned to children require guardian approval.
- Only a registered guardian may approve a child assignment.
- A chore moves through `draft`, `assigned`, `in-progress`, and `completed`.
- Completion records time and an optional note.
- Phoenix may recommend and coordinate chores, but it does not claim physical completion without an explicit completion transition.

## Acceptance coverage

The fixture proves that:

1. a low-risk kitchen chore can be assigned directly to an eligible child;
2. the chore can be started and completed;
3. a medium-risk laundry chore remains draft until a guardian approves it;
4. an ineligible younger age band is blocked.
