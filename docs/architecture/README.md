# Phoenix One Architecture

## Canonical Sources

Phoenix One uses a split-source governance model:

- **Google Drive is canonical for approved architecture, governance, decisions and product documentation.**
- **GitHub is canonical for governed implementation artifacts, schemas, code, tests, migrations and releases.**
- Chat output is a working surface and is not canonical.

Canonical Drive repository:

https://drive.google.com/drive/folders/18sPNWzPn22YGDAgMcvJd_f_DSIUhgpLg?usp=drive_link

## Governing Architecture Baseline

### Phase 0 – Governance Baseline

- [PHX-ARCH-001 – Phoenix One Architecture Catalog and Development Roadmap v1.0](https://docs.google.com/document/d/1n3IOzpSSv10xUQS39dBviebhZtLYSE3a1CEbTfcb5SM/edit)
- [PHX-ARCH-GOV-001 – Phoenix One Architecture Governance Model v1.0](https://docs.google.com/document/d/1jK2Ip7uOfEcbGbPK5as33Vm8XzyBzCYJcsyoVWbPJqc/edit)
- [PHX-NAME-001 – Phoenix One Naming and Identifier Convention v1.0](https://docs.google.com/document/d/1WUVI6UBkId3rrmokpwWkkwJV7sL34RdkK1gjhZhtdaI/edit)
- [PHX-VER-001 – Phoenix One Versioning and Lifecycle Standard v1.0](https://docs.google.com/document/d/1Ul1qONrxxa710Vvhtj9p02MGE0S-p72sPoOn68Dj21Y/edit)
- [PHX-ADR-001 – Phoenix One Architecture Decision Record Standard v1.0](https://docs.google.com/document/d/1qY9HvJ_fEYEO1tPnFSifhUSuG_anQ0UBJdWN6tXoG78/edit)
- [PHX-REL-STD-001 – Phoenix One Cross-Reference and Traceability Standard v1.0](https://docs.google.com/document/d/15h3vApIi01Zwsv7Pn88_foTG6QL6tEAlPw_9NaQ8Sj8/edit)
- [PHX-REG-GOV-001 – Phoenix One Registry Governance Standard v1.0](https://docs.google.com/document/d/16OyfgIb_4h0SzXYwxMuQx9_RQCWMfJn6b1cf9oR661E/edit)

### Phase 1 – Universal Object Foundation

- [PHX-OBJ-001 – Phoenix One Universal Object Model v1.0](https://docs.google.com/document/d/1vu29uZjGTGBO05FMgz7n0iNOWRx-AUmSUetpYottLc4/edit)
- [PHX-ID-001 – Phoenix One Universal Identity Model v1.0](https://docs.google.com/document/d/1wuxqwnwz1DS1jAmdVNvheUXvQhF4e4LFDJBZhrn-2Xg/edit)
- [PHX-TYPE-001 – Phoenix One Universal Type System v1.0](https://docs.google.com/document/d/1-hZZfFe3poh6Q12jCsqovq1zQyArXvsv4TjpNoyeasI/edit)
- [PHX-REL-001 – Phoenix One Universal Relationship Model v1.0](https://docs.google.com/document/d/1GCQRoVDA3iJfb4q0-lhJCLmOTahShB5RWfooVBzzFQ4/edit)
- [PHX-META-001 – Phoenix One Universal Metadata Contract v1.0](https://docs.google.com/document/d/1rlNpn2d2VdNHxrKzCS2YzN1WXyCOOPmKVpBontSaJQQ/edit)
- [PHX-REG-001 – Phoenix One Universal Registry Model v1.0](https://docs.google.com/document/d/1YueSZkEFZb11WCq-dEYOo7RlRgCD1eXrUYfeUFuUh-U/edit)
- [PHX-REG-SVC-001 – Phoenix One Registry Service Contract v1.0](https://docs.google.com/document/d/15alfvN6ndYYQ20E591DQrk0h5SEBXpl2v04DRpH3eVw/edit)
- [PHX-REF-001 – Phoenix One Universal Reference Contract v1.0](https://docs.google.com/document/d/1EwK70gg69YTsWPrNzl0hnyE306KVfTDKFBMc37UZuK0/edit)

## Repository Rules

1. Implementation work must reference the governing PHX artifact ID and version.
2. Pull requests that change architecture-relevant behavior must reference the applicable ADR.
3. GitHub must not silently redefine universal architecture contracts.
4. Architecture documents are not duplicated here as competing canonical copies.
5. Machine-readable schemas and implementation contracts are stored in GitHub after their governing architecture artifact is approved.
6. Breaking changes require an approved ADR, migration plan, compatibility assessment and rollback strategy.

## Current Architecture Status

- **Phase 0 – Governance Baseline: APPROVED, persisted and read-back verified.**
- **Phase 1 – Universal Object Foundation: APPROVED, persisted and read-back verified.**

The Phase 1 architecture is at **G3 / M2**: approved and contracted, but not yet implemented.

## Next Governed Work

The next step is the G4 implementation package for the Universal Object Foundation:

1. machine-readable JSON Schemas
2. registry seed definitions
3. canonical examples and invalid fixtures
4. compatibility and conformance tests
5. reference parser/resolver contract fixtures
6. initial package structure and CI validation

After the G4 package is established, Phoenix can begin the PDOS object and state model against this foundation.

## Traceability

This file is a GitHub navigation and implementation-governance entry point. It does not replace the canonical Drive artifacts.
