import assert from "node:assert/strict";
import {
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

const invalidResult = validateAccountabilityRecord(invalidSilentActiveRecord);
assert.equal(invalidResult.valid, false, "silent ACTIVE record must be rejected");
assert.ok(
  invalidResult.errors.includes(
    "ACTIVE records require at least one completed action",
  ),
  "silent ACTIVE rejection reason must be explicit",
);

console.log(
  JSON.stringify(
    {
      suite: "EO Accountability Cycle v2",
      validFixtures: validRecords.length,
      rejectedFixtures: 1,
      status: "PASS",
    },
    null,
    2,
  ),
);
