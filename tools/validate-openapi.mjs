import { readFile } from 'node:fs/promises';
import YAML from 'yaml';

const file = new URL('../packages/openapi/openapi.yaml', import.meta.url);
const document = YAML.parse(await readFile(file, 'utf8'));

const required = ['openapi', 'info', 'paths', 'components'];
for (const key of required) {
  if (!(key in document)) {
    console.error(`Missing OpenAPI root key: ${key}`);
    process.exit(1);
  }
}

if (!String(document.openapi).startsWith('3.1.')) {
  console.error('PDOS requires OpenAPI 3.1.x.');
  process.exit(1);
}

const operationIds = new Set();
for (const pathItem of Object.values(document.paths)) {
  for (const [method, operation] of Object.entries(pathItem)) {
    if (!['get', 'post', 'put', 'patch', 'delete'].includes(method)) continue;
    if (!operation.operationId) {
      console.error(`Missing operationId on ${method.toUpperCase()}.`);
      process.exit(1);
    }
    if (operationIds.has(operation.operationId)) {
      console.error(`Duplicate operationId: ${operation.operationId}`);
      process.exit(1);
    }
    operationIds.add(operation.operationId);
  }
}

console.log('OpenAPI baseline validation passed.');
