// Generate a tscircuit chip-wrapper `.tsx` file for a cached LCSC component.
// Output mirrors the li-charger/imports/TP4056.tsx style: const pinLabels +
// `export const NAME = (props: ChipProps<typeof pinLabels>) => <chip … />`.

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const COMPONENT_DIR = path.resolve(__dirname, "..", "..", ".tmp", "components");

function mm(n) { return `${n.toFixed(4)}mm`; }

// Stringify a route (array of {x,y}) as JSX-ready JSON.
function route(points) {
    return JSON.stringify(points.map(p => ({ x: p.x, y: p.y })));
}

export function generateChipImport({
    componentName,           // export name, e.g. "TPS5430"
    lcsc,                    // LCSC code used both for the cache file + cadModel URL
    pinLabels,               // { "1": "BOOT", "2": "VIN", ... }
    manufacturerPartNumber,  // e.g. "TPS5430DDAR"
}) {
    const cachePath = path.join(COMPONENT_DIR, `${lcsc}.circuit.json`);
    if (!fs.existsSync(cachePath)) throw new Error(`No cache for ${lcsc}`);
    const cache = JSON.parse(fs.readFileSync(cachePath, "utf8"));

    // Footprint elements
    const fpLines = [];
    for (const el of cache) {
        if (el.type === "pcb_smtpad") {
            fpLines.push(`        <smtpad portHints={["pin${el.port_hints?.[0]?.replace(/^pin/, "") ?? el.pcb_smtpad_id}"]} pcbX="${mm(el.x)}" pcbY="${mm(el.y)}" width="${mm(el.width)}" height="${mm(el.height)}" shape="${el.shape || "rect"}" />`);
        } else if (el.type === "pcb_plated_hole") {
            fpLines.push(`        <platedhole portHints={["pin${el.port_hints?.[0]?.replace(/^pin/, "") ?? el.pcb_plated_hole_id}"]} pcbX="${mm(el.x)}" pcbY="${mm(el.y)}" shape="circle" outerDiameter="${mm(el.outer_diameter)}" holeDiameter="${mm(el.hole_diameter)}" />`);
        } else if (el.type === "pcb_silkscreen_path") {
            fpLines.push(`        <silkscreenpath route={${route(el.route)}} />`);
        } else if (el.type === "pcb_courtyard_outline") {
            fpLines.push(`        <courtyardoutline outline={${route(el.outline)}} />`);
        }
    }
    fpLines.push(`        <silkscreentext text="{NAME}" pcbX="0mm" pcbY="-5mm" anchorAlignment="center" fontSize="1mm" />`);

    // cadModel
    const cad = cache.find(x => x.type === "cad_component");
    let cadBlock = "";
    if (cad) {
        const uuid = (cad.model_obj_url || cad.model_step_url || "").match(/\/([0-9a-f]{32,})/i)?.[1];
        if (uuid) {
            const lines = [
                `      cadModel={{`,
                `        objUrl: "https://modelcdn.tscircuit.com/easyeda_models/assets/${lcsc}.obj?uuid=${uuid}",`,
                `        stepUrl: "https://modelcdn.tscircuit.com/easyeda_models/assets/${lcsc}.step?uuid=${uuid}",`,
            ];
            if (cad.rotation?.z) lines.push(`        pcbRotationOffset: ${cad.rotation.z},`);
            if (cad.model_origin_position) {
                const p = cad.model_origin_position;
                lines.push(`        modelOriginPosition: { x: ${p.x ?? 0}, y: ${p.y ?? 0}, z: ${p.z ?? 0} },`);
            }
            lines.push(`      }}`);
            cadBlock = lines.join("\n");
        }
    }

    // pinLabels block as TS-friendly const
    const pinLabelLines = Object.entries(pinLabels)
        .sort(([a], [b]) => Number(a) - Number(b))
        .map(([n, name]) => `  pin${n}: ["${name}"],`)
        .join("\n");

    return `import type { ChipProps } from "@tscircuit/props"

const pinLabels = {
${pinLabelLines}
} as const

export const ${componentName} = (props: ChipProps<typeof pinLabels>) => {
  return (
    <chip
      pinLabels={pinLabels}
      supplierPartNumbers={{ jlcpcb: ["${lcsc}"] }}
      manufacturerPartNumber="${manufacturerPartNumber}"
      footprint={<footprint>
${fpLines.join("\n")}
      </footprint>}
${cadBlock}
      {...props}
    />
  )
}
`;
}
