// Wraps the `easyeda` CLI to download raw component JSON and convert it to
// circuit-json once, then memoise to disk so subsequent runs are offline.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { execFileSync } from "node:child_process";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Directories — relative to repo root.
export const REPO_ROOT = path.resolve(__dirname, "..", "..");
export const CACHE_DIR = path.join(REPO_ROOT, ".tmp", "cache");
export const COMPONENT_DIR = path.join(REPO_ROOT, ".tmp", "components");

const EASYEDA_BIN = process.env.EASYEDA_BIN ||
    "C:\\Users\\FQ\\AppData\\Roaming\\npm\\easyeda.cmd";

function ensureDir(d) { if (!fs.existsSync(d)) fs.mkdirSync(d, { recursive: true }); }

function runEasyeda(args) {
    // shell:true is required for .cmd shims on Windows under Node 18+ for security reasons (CVE-2024-27980).
    return execFileSync(EASYEDA_BIN, args, { stdio: ["ignore", "pipe", "pipe"], shell: true }).toString();
}

export function rawPath(lcsc) { return path.join(CACHE_DIR, `${lcsc}.raweasy.json`); }
export function circuitPath(lcsc) { return path.join(COMPONENT_DIR, `${lcsc}.circuit.json`); }

export function downloadRaw(lcsc) {
    ensureDir(CACHE_DIR);
    const out = rawPath(lcsc);
    if (fs.existsSync(out)) return out;
    runEasyeda(["download", "-i", lcsc, "-o", out]);
    return out;
}

export function convertToCircuitJson(lcsc) {
    ensureDir(COMPONENT_DIR);
    const out = circuitPath(lcsc);
    if (fs.existsSync(out)) return out;
    // Convert from the cached raw file rather than re-hitting the API.
    const raw = downloadRaw(lcsc);
    runEasyeda(["convert", "-i", raw, "-o", out]);
    return out;
}

export function loadComponentCircuitJson(lcsc) {
    const p = convertToCircuitJson(lcsc);
    return JSON.parse(fs.readFileSync(p, "utf8"));
}

export async function preloadAll(lcscIds, { onProgress } = {}) {
    let i = 0;
    const total = lcscIds.length;
    for (const lcsc of lcscIds) {
        i++;
        const cached = fs.existsSync(circuitPath(lcsc));
        if (onProgress) onProgress({ i, total, lcsc, cached });
        convertToCircuitJson(lcsc);
    }
}
