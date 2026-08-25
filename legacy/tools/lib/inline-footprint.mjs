// Produce a tscircuit `<footprint>` JSX element from a cached LCSC
// component, so parts without a known footprinter name (custom radial caps,
// chokes, modules…) still get the right pads on the PCB.
//
// Reads the cache JSON written by easyeda-converter at .tmp/components/.

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const COMPONENT_DIR = path.resolve(__dirname, "..", "..", ".tmp", "components");

function cachePath(lcsc) {
    return path.join(COMPONENT_DIR, `${lcsc}.circuit.json`);
}

function readCache(lcsc) {
    const p = cachePath(lcsc);
    if (!fs.existsSync(p)) return null;
    return JSON.parse(fs.readFileSync(p, "utf8"));
}

// Pretty-print a number for inline mm strings.
function mm(n) { return `${n.toFixed(3)}mm`; }

// Build <smtpad … /> for every SMT pad, <platedhole … /> for every plated
// hole, plus <silkscreenpath …/> for silk lines (skipped today — the auto
// silkscreen tscircuit produces is good enough).
//
// Returns a string of JSX children, or null when the cache file is missing.
export function inlineFootprintJSX(lcsc) {
    const cache = readCache(lcsc);
    if (!cache) return null;

    // Follow tscircuit's own footprint imports (e.g. li-charger/imports/
    // A_8205A.tsx): smtpad portHints use the `pinN` form. Bare numbers are
    // NOT used here. Keep both anyway for compatibility with chips that
    // sometimes expose just "1" in their schemes.
    const portHintsFor = arr => {
        const base = (arr || []).map(h => `pin${String(h).replace(/^pin/, "")}`);
        return base;
    };

    const lines = [];
    for (const el of cache) {
        if (el.type === "pcb_smtpad") {
            const portHints = portHintsFor(el.port_hints?.length ? el.port_hints : [el.pcb_smtpad_id]);
            lines.push(
                `      <smtpad portHints={${JSON.stringify(portHints)}} pcbX="${mm(el.x)}" pcbY="${mm(el.y)}" shape="${el.shape || "rect"}" width="${mm(el.width)}" height="${mm(el.height)}" />`
            );
        } else if (el.type === "pcb_plated_hole") {
            const portHints = portHintsFor(el.port_hints?.length ? el.port_hints : [el.pcb_plated_hole_id]);
            lines.push(
                `      <platedhole portHints={${JSON.stringify(portHints)}} pcbX="${mm(el.x)}" pcbY="${mm(el.y)}" shape="circle" outerDiameter="${mm(el.outer_diameter)}" holeDiameter="${mm(el.hole_diameter)}" />`
            );
        }
    }
    if (lines.length === 0) return null;
    return `<footprint>\n${lines.join("\n")}\n    </footprint>`;
}
