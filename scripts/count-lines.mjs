import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { extname } from 'node:path';

const files = execFileSync('git', ['ls-files', '-z'], { encoding: 'utf8' }).split('\0').filter(Boolean);
const rows = new Map();
const sourceExts = new Set(['.ts', '.tsx', '.js', '.mjs']);
const styleExts = new Set(['.css', '.scss', '.sass', '.less']);
const markupExts = new Set(['.html', '.md', '.mdx', '.svg']);

function bucket(path) {
  if (path.startsWith('node_modules/') || path.startsWith('dist/') || path.startsWith('out/') || path.endsWith('.lock')) return 'excluded';
  if (path.startsWith('tests/') || path.includes('/tests/') || path.startsWith('__tests__/') || path.includes('.test.')) return 'tests';
  if (path.startsWith('content/') && path.endsWith('.json')) return 'generated';
  if (styleExts.has(extname(path))) return 'styles/markup';
  if (markupExts.has(extname(path))) return 'styles/markup';
  if (sourceExts.has(extname(path))) return 'source';
  return 'other';
}

function count(path) {
  const text = readFileSync(path, 'utf8');
  if (text.length === 0) return { total: 0, nonBlank: 0 };
  const lines = text.split(/\r\n|\n|\r/);
  if (lines.at(-1) === '') lines.pop();
  return { total: lines.length, nonBlank: lines.filter((line) => line.trim().length > 0).length };
}

for (const file of files) {
  const key = bucket(file);
  const value = count(file);
  const row = rows.get(key) || { files: 0, total: 0, nonBlank: 0 };
  row.files += 1;
  row.total += value.total;
  row.nonBlank += value.nonBlank;
  rows.set(key, row);
}

console.log('| Area | Files | Lines | Non-blank lines |');
console.log('| --- | ---: | ---: | ---: |');
for (const key of ['source', 'tests', 'styles/markup', 'generated', 'other', 'excluded']) {
  const row = rows.get(key) || { files: 0, total: 0, nonBlank: 0 };
  console.log(`| ${key} | ${row.files} | ${row.total} | ${row.nonBlank} |`);
}
