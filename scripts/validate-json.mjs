/**
 * Validates game data JSON files against their JSON Schema definitions.
 * Exit code 0 = all valid, 1 = validation failed.
 */
import Ajv from 'ajv';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const rootDir = join(__dirname, '..');

const pairs = [
  ['schemas/modules.schema.json', 'src/data/modules.json'],
  ['schemas/events.schema.json', 'src/data/events.json'],
  ['schemas/achievements.schema.json', 'src/data/achievements.json'],
  ['schemas/research.schema.json', 'src/data/research.json'],
  ['schemas/moduleSetBonuses.schema.json', 'src/data/moduleSetBonuses.json'],
  ['schemas/narrator.schema.json', 'src/data/narrator.json'],
];

const ajv = new Ajv({ allErrors: true });
let failed = false;

for (const [schemaPath, dataPath] of pairs) {
  const schemaFull = join(rootDir, schemaPath);
  const dataFull = join(rootDir, dataPath);
  const name = dataPath;

  try {
    const schema = JSON.parse(readFileSync(schemaFull, 'utf8'));
    const data = JSON.parse(readFileSync(dataFull, 'utf8'));
    const validate = ajv.compile(schema);
    const valid = validate(data);

    if (valid) {
      console.log(`✓ ${name}`);
    } else {
      failed = true;
      console.error(`✗ ${name}`);
      console.error(validate.errors);
    }
  } catch (err) {
    failed = true;
    console.error(`✗ ${name}: ${err.message}`);
  }
}

process.exit(failed ? 1 : 0);
