import assert from "node:assert/strict";
import {
  invalidAllClearWithoutEvidence,
  invalidArchivedActiveRecord,
  invalidNoEvidenceFlags,
  invalidScoreMismatchRecord,
  invalidScoreRangeRecord,
  invalidSilentActiveRecord,
  validActiveRecord,
  validAllClearRecord,
  validNoEvidenceRecord,
} from "./fixtures.js";
import { validateAccountabilityRecord } from "./validator.js";

const validRecords = [
  validActiveRecord,
  validAllClearRecord,
  validNoEvidenceRecord,
];

for (const record of validRecords) {
  const result = validateAccountabilityRecord(record);
  assert.equal(
    result.valid,
    true,
    `${record.actorId} should be valid: ${result.errors.join(", ")}`,
  );
}

const invalidCases = [
  {
    record: invalidSilentActiveRecord,
    expected: "ACTIVE records require at least one completed action",
  },
  {
    record: invalidScoreRangeRecord,
    expected: "scoreInputs.impact must be a finite number between 0 and 100",
  },
  {
    record: invalidAllClearWithoutEvidence,
    expected: "evidence is required unless activityState is NO_EVIDENCE",
  },
  {
    record: invalidNoEvidenceFlags,
    expected: "NO_EVIDENCE records must set flags.missingEvidence=true",
  },
  {
    record: invalidArchivedActiveRecord,
    expected: "ARCHIVED actors cannot have ACTIVE activity state",
  },
  {
    record: invalidScoreMismatchRecord,
    expected: `healthScore must equal deterministic result ${validActiveRecord.healthScore}`,
  },
];

for (const testCase of invalidCases) {
  const result = validateAccountabilityRecord(testCase.record);
  assert.equal(result.valid, false, `${testCase.record.actorId} must be rejected`);
  assert.ok(
    result.errors.includes(testCase.expected),
    `${testCase.record.actorId} must include expected error: ${testCase.expected}`,
  );
}

console.log(
  JSON.stringify(
    {
      suite: "EO Accountability Cycle v2",
      validFixtures: validRecords.length,
      rejectedFixtures: invalidCases.length,
      status: "PASS",
    },
    null,
    2,
  ),
);
