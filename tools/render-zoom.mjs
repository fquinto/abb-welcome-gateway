// Crop circuit.json to a single component plus a small radius and render it.
// Usage: node render-zoom.mjs <designator> [radius_mm]
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { convertCircuitJsonToPcbSvg } from "circuit-to-svg";
import { Resvg } from "@resvg/resvg-js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, "..");
const designator = process.argv[2] || "P1";
const radius = Number(process.argv[3] ?? 8);

const json = JSON.parse(fs.readFileSync(path.join(REPO_ROOT, "hardware", "easyeda-v2", "circuit.json"), "utf8"));
const sourceByName = new Map();
for (const el of json) if (el.type === "source_component") sourceByName.set(el.name, el);
const target = sourceByName.get(designator);
if (!target) { console.error("designator not found:", designator); process.exit(1); }
const pcb = json.find(x => x.type === "pcb_component" && x.source_component_id === target.source_component_id);
const cx = pcb.center.x, cy = pcb.center.y;
console.log(`${designator}: centre (${cx.toFixed(2)}, ${cy.toFixed(2)})`);

// Keep only elements that belong to this component, plus a fresh small board.
const keep = new Set([
    target.source_component_id,
    pcb.pcb_component_id,
]);
const cropped = [
    { type: "pcb_board", pcb_board_id: "b", center: { x: cx, y: cy }, width: radius * 2, height: radius * 2, thickness: 1.6, num_layers: 2, material: "fr4" },
    target,
    pcb,
    ...json.filter(el => keep.has(el.source_component_id) || keep.has(el.pcb_component_id)),
];

const svg = convertCircuitJsonToPcbSvg(cropped);
const outName = `${designator}-zoom`;
fs.writeFileSync(path.join(REPO_ROOT, ".tmp", `${outName}.svg`), svg);
fs.writeFileSync(path.join(REPO_ROOT, ".tmp", `${outName}.png`),
    new Resvg(svg, { fitTo: { mode: "zoom", value: 6 } }).render().asPng());
console.log(`Wrote .tmp/${outName}.{svg,png}`);
