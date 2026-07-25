# Phoenix One Architecture

## Canonical Sources

Phoenix One uses a split-source governance model:

- **Google Drive is canonical for approved architecture, governance, decisions and product documentation.**
- **GitHub is canonical for governed implementation artifacts, schemas, code, tests, migrations and releases.**
- Chat output is a working surface and is not canonical.

Canonical Drive repository:

https://drive.google.com/drive/folders/18sPNWzPn22YGDAgMcvJd_f_DSIUhgpLg?usp=drive_link

## Governing Architecture Baseline

- [PHX-ARCH-001 – Phoenix One Architecture Catalog and Development Roadmap v1.0](https://docs.google.com/document/d/1n3IOzpSSv10xUQS39dBviebhZtLYSE3a1CEbTfcb5SM/edit)
- [PHX-ARCH-GOV-001 – Phoenix One Architecture Governance Model v1.0](https://docs.google.com/document/d/1jK2Ip7uOfEcbGbPK5as33Vm8XzyBzCYJcsyoVWbPJqc/edit)
- [PHX-NAME-001 – Phoenix One Naming and Identifier Convention v1.0](https://docs.google.com/document/d/1WUVI6UBkId3rrmokpwWkkwJV7sL34RdkK1gjhZhtdaI/edit)
- [PHX-VER-001 – Phoenix One Versioning and Lifecycle Standard v1.0](https://docs.google.com/document/d/1Ul1qONrxxa710Vvhtj9p02MGE0S-p72sPoOn68Dj21Y/edit)
- [PHX-ADR-001 – Phoenix One Architecture Decision Record Standard v1.0](https://docs.google.com/document/d/1qY9HvJ_fEYEO1tPnFSifhUSuG_anQ0UBJdWN6tXoG78/edit)
- [PHX-REL-STD-001 – Phoenix One Cross-Reference and Traceability Standard v1.0](https://docs.google.com/document/d/15h3vApIi01Zwsv7Pn88_foTG6QL6tEAlPw_9NaQ8Sj8/edit)
- [PHX-REG-GOV-001 – Phoenix One Registry Governance Standard v1.0](https://docs.google.com/document/d/16OyfgIb_4h0SzXYwxMuQx9_RQCWMfJn6b1cf9oR661E/edit)

## Repository Rules

1. Implementation work must reference the governing PHX artifact ID and version.
2. Pull requests that change architecture-relevant behavior must reference the applicable ADR.
3. GitHub must not silently redefine universal architecture contracts.
4. Architecture documents are not duplicated here as competing canonical copies.
5. Machine-readable schemas and implementation contracts may be stored in GitHub once their governing architecture artifact is approved.
6. Breaking changes require an approved ADR, migration plan, compatibility assessment and rollback strategy.

## Current Architecture Phase

**Phase 0 – Governance Baseline: approved and persisted.**

Next governed phase:

**Phase 1 – Universal Object Foundation**

Planned sequence:

1. PHX-OBJ-001 – Universal Object Model
2. PHX-ID-001 – Universal Identity and Identifier Model
3. PHX-TYPE-001 – Type and Schema System
4. PHX-REL-001 – Universal Relationship Model
5. PHX-META-001 – Metadata Contract
6. PHX-REG-001 – Universal Registry Model
7. PHX-REG-SVC-001 – Registry Service Contract
8. PHX-REF-001 – Universal Reference Contract

## Traceability

This file is a GitHub navigation and implementation-governance entry point. It does not replace the canonical Drive artifacts.
