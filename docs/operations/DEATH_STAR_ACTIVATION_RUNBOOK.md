# Death Star Activation Runbook

## Purpose

Complete the final Phoenix activation gates for the governed command chain:

**Death Star -> Darth Vader -> Billy**

Billy is the Phoenix Executive Office and is not a Companion.

## Preconditions

The technical and governance implementation must already be present on `main`:

- `config/executive-office.json`
- `config/product-workstreams.json`
- `governance/PHX-GOV-006-Billy-Executive-Office.md`
- `scripts/validate-billy.mjs`
- `.github/workflows/billy-governance.yml`
- `.github/workflows/death-star-issue-sync.yml`

Run locally before touching administration:

```bash
npm run validate:billy
npm test
```

Do not continue if either command fails.

## Gate 1 - GitHub Actions availability

1. Open repository Actions settings.
2. Confirm Actions are enabled for the repository.
3. Confirm GitHub-hosted runners are permitted.
4. Confirm workflow permissions permit the repository workflows to run.
5. Re-run or trigger `Billy Executive Office Governance`.
6. Require a successful conclusion before marking this gate complete.

Known blocked run at the time this runbook was created:

- Run ID: `31120000165`
- Workflow: `Billy Executive Office Governance`
- Observed state: `queued`

### Abort criteria

Stop if the workflow remains queued because of billing, organization policy, runner restrictions, or repository Actions permissions. Resolve the administrative cause first; do not weaken governance checks to bypass it.

## Gate 2 - Provision Death Star credential

Create the repository Actions secret:

`DEATH_STAR_SYNC_TOKEN`

The token must be able to dispatch repository events to:

`thomascatulli-1976/signal-decisions-enterprise-platform`

The secret value must never be committed, logged, copied into issues, or stored in repository files.

The workflow intentionally exits with failure when the secret is absent.

### Abort criteria

Stop if the credential cannot be scoped to the required Death Star repository or if its ownership/rotation responsibility is unclear.

## Gate 3 - Send a controlled synchronization event

Use Phoenix issue `#12` as the activation control record.

After Gate 1 and Gate 2 are complete, edit or comment on issue `#12` with a harmless activation-test message. The `Death Star Issue Sync` workflow should dispatch an `os_issue_event` with:

- OS ID: `PHOENIX`
- source repository: `thomascatulli-1976/phoenix`
- source issue: `12`
- correlation ID based on the Phoenix issue

Do not include credentials or sensitive data in the test message.

## Gate 4 - Verify Death Star receipt

Require evidence that the event reached the Death Star repository and produced the expected enterprise record.

Record the following evidence in Phoenix issue `#12`:

- source workflow run ID
- successful workflow conclusion
- correlation ID
- Death Star record URL or identifier
- timestamp

Do not mark the synchronization gate complete on the basis of a successful HTTP dispatch alone if no Death Star record can be identified.

## Gate 5 - Verify return path

The Phoenix workflow accepts `repository_dispatch` events of type `death_star_instruction`.

Verify a controlled Death Star instruction returns to Phoenix issue `#12` and creates a comment containing the marker:

`<!-- death-star-sync -->`

Confirm the instruction includes a correlation ID and Death Star record reference. State changes should only be tested if explicitly intended.

## Final activation criteria

Phoenix can be reported as fully operational under Billy only when all of the following are true:

- Billy governance validation succeeds.
- GitHub Actions executes normally.
- `DEATH_STAR_SYNC_TOKEN` is provisioned and controlled.
- A Phoenix -> Death Star synchronization succeeds with evidence.
- A Death Star -> Phoenix controlled instruction succeeds with evidence.
- All six Billy-owned workstreams remain active and governed.
- Consequential external actions remain fail-closed unless separately approved.

## Ownership

- Phoenix Executive Office: **Billy**
- Direct upstream authority: **Darth Vader**
- Ultimate authority: **Death Star**
- Administrative credential/runner gates: authorized GitHub repository or organization administrator
