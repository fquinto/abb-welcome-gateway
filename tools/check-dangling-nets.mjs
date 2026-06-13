#!/usr/bin/env node
// Flags nets in output/index.circuit.tsx that are bound by only a single pin —
// i.e. dangling nodes that connect to nothing else. This is the check that
// would have caught the v2→v3 conversion's fan of single-occurrence
// net.unnamed_* / Q4_3 / D2_2 nodes automatically.
//
// Only `connections={{ … }}` blocks are scanned, so net names mentioned in
// comments don't mask or invent references. Pure node builtins → runs anywhere
// (including CI with no install step).
//
// Usage:  node check-dangling-nets.mjs [path/to/file.tsx]
// Exit 1 if any net is referenced by fewer than two pins.

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, "..");
const TARGET = process.argv[2]
    ? path.resolve(process.argv[2])
    : path.join(REPO_ROOT, "output", "index.circuit.tsx");

const src = fs.readFileSync(TARGET, "utf8");

// Count every `net.<NAME>` that appears inside a connections block. The inner
// object has no nested braces, so a non-greedy match to the first `}}` is safe.
const counts = new Map();
const blockRe = /connections=\{\{([\s\S]*?)\}\}/g;
const netRe = /net\.([A-Za-z_][A-Za-z0-9_]*)/g;
let block;
let pinRefs = 0;
while ((block = blockRe.exec(src)) !== null) {
    let n;
    while ((n = netRe.exec(block[1])) !== null) {
        counts.set(n[1], (counts.get(n[1]) ?? 0) + 1);
        pinRefs++;
    }
}

const rel = path.relative(REPO_ROOT, TARGET);
console.log(`Checked ${rel}: ${counts.size} nets, ${pinRefs} pin references.`);

const dangling = [...counts.entries()]
    .filter(([, n]) => n < 2)
    .map(([net]) => net)
    .sort();

if (dangling.length) {
    console.error(`\n✗ ${dangling.length} dangling net(s) (bound by a single pin):`);
    for (const net of dangling) console.error(`    net.${net}`);
    console.error(`\nEach net should connect at least two pins. Wire it up or rename to a real node.`);
    process.exit(1);
}

console.log("\n✓ No dangling nets — every net connects ≥2 pins.");
