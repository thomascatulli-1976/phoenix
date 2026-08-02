# Phoenix Family Acceptance Suite

The Phoenix Family foundation now exposes one aggregate acceptance entry point:

- `runPhoenixFamilyAcceptanceSuite()` returns one result per suite.
- `assertPhoenixFamilyAcceptanceSuite()` fails with a compact multi-suite report.

Included suites:

1. family vertical slice
2. governed learning
3. calendar scheduling boundary
4. shopping budget boundary
5. kids kitchen participation
6. leftover reuse
7. household chores
8. operations cockpit

## Governance intent

The suite checks domain-level contracts only. It does not claim that external systems have been called.

External actions remain approval-gated and require adapters for:

- Google Calendar writes
- retailer or shopping-provider execution
- Thermomix device control
- persistent storage and audit export

## CI integration

The aggregate suite is intentionally framework-free. Once the repository TypeScript baseline and test runner are available on the branch, CI should invoke `assertPhoenixFamilyAcceptanceSuite()` and fail the build on any rejected contract.
