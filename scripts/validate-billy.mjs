import fs from 'node:fs';

const cfg = JSON.parse(fs.readFileSync('config/executive-office.json', 'utf8'));
const workstreams = JSON.parse(fs.readFileSync('config/product-workstreams.json', 'utf8'));

const requiredProducts = [
  'Phoenix Trading',
  'Phoenix Sports',
  'Phoenix Hockey',
  'Phoenix Family',
  'Phoenix Thermomix & Cooking',
  'Signal Cockpit'
];

const failures = [];

if (cfg.executiveOffice?.name !== 'Billy') failures.push('EO must be Billy');
if (cfg.executiveOffice?.role !== 'Executive Office') failures.push('Billy role is invalid');
if (cfg.executiveOffice?.status !== 'active') failures.push('Billy must be active');
if (cfg.executiveOffice?.reportsTo !== 'Darth Vader') failures.push('Billy must report to Darth Vader');
if (cfg.executiveOffice?.ultimateAuthority !== 'Death Star') failures.push('Death Star must be ultimate authority');
if (cfg.executiveOffice?.isCompanion !== false) failures.push('Billy must not be a Companion');
if (JSON.stringify(cfg.commandChain) !== JSON.stringify(['Death Star', 'Darth Vader', 'Billy'])) {
  failures.push('Command chain is invalid');
}

const products = new Map((cfg.products || []).map((product) => [product.name, product]));
for (const name of requiredProducts) {
  const product = products.get(name);
  if (!product) failures.push(`Missing product: ${name}`);
  else if (product.owner !== 'Billy') failures.push(`${name} must be owned by Billy`);
  else if (product.status !== 'active-development') failures.push(`${name} must be in active-development`);
}

const streams = new Map((workstreams.workstreams || []).map((stream) => [stream.name, stream]));
for (const name of requiredProducts) {
  const stream = streams.get(name);
  if (!stream) failures.push(`Missing workstream: ${name}`);
  else {
    if (stream.owner !== 'Billy') failures.push(`${name} workstream must be owned by Billy`);
    if (!stream.nextDeliverable) failures.push(`${name} needs a next deliverable`);
    if (!Array.isArray(stream.blockers)) failures.push(`${name} blockers must be visible`);
  }
}

if (cfg.synchronization?.upstream !== 'Darth Vader') failures.push('Sync upstream must be Darth Vader');
if (cfg.synchronization?.enterpriseTarget !== 'Death Star') failures.push('Sync target must be Death Star');
if (cfg.synchronization?.credential !== 'DEATH_STAR_SYNC_TOKEN') failures.push('Credential name is invalid');
if (cfg.synchronization?.failClosed !== true) failures.push('Synchronization must fail closed');
if (cfg.executionPolicy?.externalActionsRequireApproval !== true) failures.push('External actions must require approval');

if (failures.length > 0) {
  console.error('Billy EO governance validation failed:\n');
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log('Billy EO governance configuration is valid.');
console.log(`Validated ${requiredProducts.length} Billy-owned product workstreams.`);
