import { readFile } from 'node:fs/promises';
import Ajv2020 from 'ajv/dist/2020.js';
import addFormats from 'ajv-formats';

const schemaPath = new URL('../packages/contracts/schemas/decision-request/1.0.0.schema.json', import.meta.url);
const schema = JSON.parse(await readFile(schemaPath, 'utf8'));
const ajv = new Ajv2020({ allErrors: true, strict: true });
addFormats(ajv);
const validate = ajv.compile(schema);

const validFixture = {
  decision_request_id: 'dr_sports_001',
  contract_version: '1.0.0',
  domain: 'sports',
  environment: 'test',
  requested_at: '2026-07-25T10:00:00Z',
  requested_by: 'sports-adapter',
  objective: 'Evaluate a simulated sports candidate action.',
  candidate_action_ids: ['ca_001'],
  evidence_package_ids: ['ev_001'],
  trace_id: 'trace_001',
  correlation_id: 'corr_001'
};

if (!validate(validFixture)) {
  console.error(validate.errors);
  process.exit(1);
}

const invalidFixture = { ...validFixture, environment: 'live-production' };
if (validate(invalidFixture)) {
  console.error('Invalid live-production fixture was accepted.');
  process.exit(1);
}

console.log('Canonical contract validation passed.');
