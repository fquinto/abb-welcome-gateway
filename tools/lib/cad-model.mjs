// Build a `cadModel={{ objUrl, stepUrl, pcbRotationOffset, modelOriginPosition }}`
// JSX prop string from a cached LCSC component. We point to the tscircuit
// CDN (modelcdn.tscircuit.com) — same files as the original EasyEDA host but
// served with CORS so the in-browser viewer can fetch them.
//
// The cache files at .tmp/components/<LCSC>.circuit.json carry the original
// `model_obj_url` (modules.easyeda.com/3dmodel/<uuid>); we extract that UUID
// and rewrite to the CDN form.

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const COMPONENT_DIR = path.resolve(__dirname, "..", "..", ".tmp", "components");

function readCache(lcsc) {
    const p = path.join(COMPONENT_DIR, `${lcsc}.circuit.json`);
    if (!fs.existsSync(p)) return null;
    return JSON.parse(fs.readFileSync(p, "utf8"));
}

// Extract the EasyEDA model UUID from "https://modules.easyeda.com/3dmodel/<uuid>".
function uuidFromUrl(url) {
    if (!url) return null;
    const m = url.match(/\/3dmodel\/([0-9a-f]{32,})/i);
    if (m) return m[1];
    // Some URLs use a /<account>/<uuid> pattern (step URLs).
    const m2 = url.match(/\/([0-9a-f]{32,})$/i);
    return m2 ? m2[1] : null;
}

export function cadModelFor(lcsc) {
    const cache = readCache(lcsc);
    if (!cache) return null;
    const cad = cache.find(x => x.type === "cad_component");
    if (!cad) return null;
    const uuid = uuidFromUrl(cad.model_obj_url || cad.model_step_url);
    if (!uuid) return null;
    const objUrl = `https://modelcdn.tscircuit.com/easyeda_models/assets/${lcsc}.obj?uuid=${uuid}`;
    const stepUrl = `https://modelcdn.tscircuit.com/easyeda_models/assets/${lcsc}.step?uuid=${uuid}`;
    const out = { objUrl, stepUrl };

    // Preserve the cache's rotation about Z (degrees) and origin offset so the
    // model lands aligned with the footprint. Both are optional.
    if (cad.rotation && cad.rotation.z) out.pcbRotationOffset = cad.rotation.z;
    if (cad.model_origin_position) {
        const p = cad.model_origin_position;
        if (p.x || p.y || p.z) out.modelOriginPosition = { x: p.x ?? 0, y: p.y ?? 0, z: p.z ?? 0 };
    }
    return out;
}
