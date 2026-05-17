#!/usr/bin/env node
// Validate the generated circuit.json against the official zod schema.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { any_circuit_element } from "circuit-json";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, "..");
const file = process.argv[2] || path.join(REPO_ROOT, "circuit.json");

const json = JSON.parse(fs.readFileSync(file, "utf8"));
if (!Array.isArray(json)) { console.error("Expected an array of circuit elements"); process.exit(2); }

const byType = {};
const issues = [];

for (let i = 0; i < json.length; i++) {
    const el = json[i];
    byType[el.type] = (byType[el.type] || 0) + 1;
    const r = any_circuit_element.safeParse(el);
    if (!r.success) {
        issues.push({
            index: i,
            type: el.type,
            id: el[`${el.type}_id`] ?? "(no id)",
            errors: r.error.issues.slice(0, 3).map(e => `${e.path.join(".")}: ${e.message}`),
        });
    }
}

console.log(`File: ${file}`);
console.log(`Total elements: ${json.length}`);
console.log("\nBreakdown by type:");
for (const [t, n] of Object.entries(byType).sort()) console.log(`  ${t}: ${n}`);

if (issues.length === 0) {
    console.log("\nAll elements valid against circuit-json schema.");
    process.exit(0);
}

console.log(`\nValidation issues: ${issues.length}`);
const groupedByType = {};
for (const issue of issues) {
    (groupedByType[issue.type] ||= []).push(issue);
}
for (const [t, list] of Object.entries(groupedByType)) {
    console.log(`\n[${t}] ${list.length} invalid:`);
    for (const i of list.slice(0, 5)) {
        console.log(`  #${i.index} ${i.id}`);
        for (const e of i.errors) console.log(`    - ${e}`);
    }
    if (list.length > 5) console.log(`  … ${list.length - 5} more`);
}
process.exit(1);
