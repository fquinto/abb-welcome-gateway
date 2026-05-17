// Render any cached LCSC component in its natural orientation, for sanity
// checking the orientation tscircuit produces vs the EasyEDA original.
//   node render-cache.mjs <LCSC>
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { convertCircuitJsonToPcbSvg } from "circuit-to-svg";
import { Resvg } from "@resvg/resvg-js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, "..");
const lcsc = process.argv[2] || "C8465";
const cache = JSON.parse(fs.readFileSync(path.join(REPO_ROOT, ".tmp/components", `${lcsc}.circuit.json`), "utf8"));

const withBoard = [
    { type: "pcb_board", pcb_board_id: "b", center: { x: 0, y: 0 }, width: 16, height: 16, thickness: 1.6, num_layers: 2, material: "fr4" },
    ...cache,
];
const svg = convertCircuitJsonToPcbSvg(withBoard);
fs.writeFileSync(path.join(REPO_ROOT, ".tmp", `${lcsc}-natural.svg`), svg);
fs.writeFileSync(path.join(REPO_ROOT, ".tmp", `${lcsc}-natural.png`),
    new Resvg(svg, { fitTo: { mode: "zoom", value: 8 } }).render().asPng());
console.log(`Wrote .tmp/${lcsc}-natural.{svg,png}`);
