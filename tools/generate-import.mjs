#!/usr/bin/env node
// One-off generator for a single import wrapper. Usage:
//   node generate-import.mjs <ComponentName> <LCSC> <ManufacturerPartNumber>
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { getPinLabels } from "./lib/chip-pinouts.mjs";
import { generateChipImport } from "./lib/chip-import-generator.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, "..");

const [componentName, lcsc, mpn] = process.argv.slice(2);
if (!componentName || !lcsc || !mpn) {
    console.error("Usage: node generate-import.mjs <ComponentName> <LCSC> <MPN>");
    process.exit(1);
}

const pinLabels = getPinLabels(lcsc);
if (!pinLabels) {
    console.error(`No pinLabels registered for ${lcsc} in chip-pinouts.mjs.`);
    process.exit(1);
}

const tsx = generateChipImport({ componentName, lcsc, pinLabels, manufacturerPartNumber: mpn });
const outDir = path.join(REPO_ROOT, "output", "imports");
fs.mkdirSync(outDir, { recursive: true });
const outFile = path.join(outDir, `${componentName}.tsx`);
fs.writeFileSync(outFile, tsx);
console.log(`Wrote ${path.relative(REPO_ROOT, outFile)}`);
