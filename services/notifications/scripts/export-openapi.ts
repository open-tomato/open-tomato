/**
 * Standalone script — writes the OpenAPI spec to `.docs/swagger/openapi.json`.
 *
 * Run via `bun scripts/export-openapi.ts` or as part of `docs:generate`.
 */
import { mkdir, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import process from 'node:process';

import { generateOpenApiDocument } from '../src/openapi.js';

const outDir = resolve(process.cwd(), '.docs/swagger');
const outFile = resolve(outDir, 'openapi.json');

await mkdir(outDir, { recursive: true });
await writeFile(outFile, JSON.stringify(generateOpenApiDocument(), null, 2), 'utf8');

console.log(`OpenAPI spec written to ${outFile}`);
