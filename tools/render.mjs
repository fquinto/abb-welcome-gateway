#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { convertCircuitJsonToPcbSvg, convertCircuitJsonToSchematicSvg } from "circuit-to-svg";
import { Resvg } from "@resvg/resvg-js";

function svgToPng(svg, scale = 2) {
    const r = new Resvg(svg, { fitTo: { mode: "zoom", value: scale } });
    return r.render().asPng();
}

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, "..");
const file = path.join(REPO_ROOT, "circuit.json");
const json = JSON.parse(fs.readFileSync(file, "utf8"));

const outDir = path.join(REPO_ROOT, ".tmp");
// Overlay <text> tags with the designator at every pcb_component centre so
// it's easy to find a specific R/C/IC in the output without relying on label
// rendering inside circuit-to-svg.
function addPcbLabels(svg, json) {
    const pcbComps = json.filter(x => x.type === "pcb_component");
    const sourceById = new Map();
    for (const el of json) if (el.type === "source_component") sourceById.set(el.source_component_id, el);

    // Pull the screen-space transform from circuit-to-svg's annotation.
    const m = svg.match(/data-real-to-screen-transform="matrix\(([^)]+)\)"/);
    if (!m) return svg;
    const [a, b, c, d, e, f] = m[1].split(",").map(Number);

    const labels = pcbComps.map(p => {
        const sc = sourceById.get(p.source_component_id);
        const name = sc?.name ?? "?";
        const sx = a * p.center.x + c * p.center.y + e;
        const sy = b * p.center.x + d * p.center.y + f;
        return `<text x="${sx.toFixed(1)}" y="${sy.toFixed(1)}" fill="#ffeb3b" stroke="#000" stroke-width="0.4" font-size="9" font-family="monospace" text-anchor="middle" dominant-baseline="middle">${name}</text>`;
    }).join("");
    return svg.replace("</svg>", labels + "</svg>");
}

const schSvg = convertCircuitJsonToSchematicSvg(json);
const pcbSvgRaw = convertCircuitJsonToPcbSvg(json);
const pcbSvg = addPcbLabels(pcbSvgRaw, json);
fs.writeFileSync(path.join(outDir, "schematic.svg"), schSvg);
fs.writeFileSync(path.join(outDir, "pcb.svg"), pcbSvg);
fs.writeFileSync(path.join(outDir, "schematic.png"), svgToPng(schSvg, 3));
fs.writeFileSync(path.join(outDir, "pcb.png"), svgToPng(pcbSvg, 4));
console.log("Wrote .tmp/{schematic,pcb}.{svg,png}");
