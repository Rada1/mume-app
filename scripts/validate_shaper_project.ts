/**
 * @file validate_shaper_project.ts
 * @description Command-line validator for Shaper project JSON files.
 */

import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { validateShaperDocument } from '../src/shaper/model/shaperValidation';
import type { ShaperWorkspaceDoc } from '../src/shaper/model/shaperTypes';

// --- Argument Section ---
const args = process.argv.slice(2);
const projectPath = args[0] || 'projects/active.shaper.json';

if (!existsSync(projectPath)) {
  console.error(`Error: Project file not found at: ${projectPath}`);
  process.exit(1);
}

// --- Main Section ---
try {
  const fileText = readFileSync(projectPath, 'utf8');
  const doc = JSON.parse(fileText) as ShaperWorkspaceDoc;

  console.log(`Validating Shaper Project: "${doc.name}" (Zone ${doc.zoneNumber})...`);

  const issues = validateShaperDocument(doc);
  const errors = issues.filter(issue => issue.severity === 'error');
  const warnings = issues.filter(issue => issue.severity === 'warning');

  if (issues.length === 0) {
    console.log('\x1b[32m✔ No validation issues found! Project is clean.\x1b[0m');
    process.exit(0);
  }

  console.log('\n--- Validation Issues Found ---');
  issues.forEach(issue => {
    const color = issue.severity === 'error' ? '\x1b[31m[ERROR]' : '\x1b[33m[WARN]';
    const roomPrefix = issue.roomId ? `Room ${issue.roomId} | ` : '';
    console.log(`${color} ${roomPrefix}${issue.message}\x1b[0m`);
  });

  console.log(`\nSummary: ${errors.length} errors, ${warnings.length} warnings.`);

  if (errors.length > 0) {
    console.error('\x1b[31m❌ Validation failed. Blocking errors must be resolved before deploy.\x1b[0m');
    process.exit(1);
  } else {
    console.log('\x1b[33m⚠ Validation passed with warnings.\x1b[0m');
    process.exit(0);
  }
} catch (err) {
  console.error('An error occurred during validation:', err);
  process.exit(1);
}
