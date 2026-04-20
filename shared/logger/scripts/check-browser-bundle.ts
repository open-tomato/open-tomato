/**
 * Build-time analysis script: verifies the browser bundle contains no
 * Node.js built-ins or Node-only package references that would break
 * browser environments, and asserts the gzipped bundle size is under 5 KB.
 */

import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { gzipSync } from 'node:zlib';

const PROHIBITED_PATTERNS: Array<{ pattern: RegExp; label: string }> = [
  { pattern: /pino-http/, label: 'pino-http' },
  { pattern: /pino-pretty/, label: 'pino-pretty' },
  { pattern: /node:crypto/, label: 'node:crypto' },
  { pattern: /node:process/, label: 'node:process' },
  { pattern: /node:fs/, label: 'node:fs' },
  { pattern: /node:path/, label: 'node:path' },
  { pattern: /node:os/, label: 'node:os' },
  { pattern: /node:stream/, label: 'node:stream' },
  { pattern: /node:http/, label: 'node:http' },
  { pattern: /node:net/, label: 'node:net' },
  { pattern: /require\("node:/, label: 'require("node:...")' },
];

// 5 KB gzipped size limit
const GZIP_SIZE_LIMIT_BYTES = 5 * 1024;

const bundlePath = resolve(import.meta.dir, '../dist/browser.js');

let bundleBytes: Buffer;
try {
  bundleBytes = readFileSync(bundlePath);
} catch {
  console.error(`ERROR: Browser bundle not found at ${bundlePath}`);
  console.error('Run "bun run build:browser" first.');
  process.exit(1);
}

const bundle = bundleBytes.toString('utf-8');
const violations: string[] = [];

for (const { pattern, label } of PROHIBITED_PATTERNS) {
  if (pattern.test(bundle)) {
    violations.push(label);
  }
}

if (violations.length > 0) {
  console.error('ERROR: Browser bundle contains prohibited Node.js-only references:');
  for (const v of violations) {
    console.error(`  - ${v}`);
  }
  process.exit(1);
}

const rawKb = (bundleBytes.length / 1024).toFixed(2);
const gzipped = gzipSync(bundleBytes);
const gzipKb = (gzipped.length / 1024).toFixed(2);

console.log(`Browser bundle: ${rawKb} KB raw, ${gzipKb} KB gzipped`);

if (gzipped.length > GZIP_SIZE_LIMIT_BYTES) {
  console.error(
    `ERROR: Browser bundle exceeds 5 KB gzipped (${gzipKb} KB). ` +
      'Check for unintended imports or large dependencies.',
  );
  process.exit(1);
}

console.log('✓ Browser bundle is clean and within size budget — no Node.js-only imports detected.');
