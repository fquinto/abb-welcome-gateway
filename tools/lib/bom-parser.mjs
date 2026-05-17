// Parse the EasyEDA-style BOM.csv (UTF-16 LE, tab-separated, optional BOM).
// Each row groups multiple designators (e.g. "R12,R13,R14,R15") sharing a
// part. We expand them into a per-designator Map.
//
// Returns Map<designator, { name, footprint, mpn, supplier, supplierPart, pins }>.

import fs from "node:fs";

function decode(buf) {
    // Detect UTF-16 LE BOM (FF FE) or fall through to UTF-8.
    if (buf.length >= 2 && buf[0] === 0xff && buf[1] === 0xfe) {
        return buf.slice(2).toString("utf16le");
    }
    return buf.toString("utf8");
}

function stripQuotes(s) {
    return s.replace(/^"|"$/g, "").trim();
}

export function parseBom(filePath) {
    const text = decode(fs.readFileSync(filePath));
    const lines = text.split(/\r?\n/).filter(l => l.trim().length > 0);
    if (lines.length === 0) return new Map();

    const header = lines[0].split("\t").map(h => stripQuotes(h));
    const col = (name) => header.indexOf(name);
    const iName = col("Name");
    const iDes = col("Designator");
    const iFp = col("Footprint");
    const iMpn = col("Manufacturer Part");
    const iSup = col("Supplier");
    const iSupPart = col("Supplier Part");
    const iPins = col("Pins");

    const out = new Map();
    for (let li = 1; li < lines.length; li++) {
        const row = lines[li].split("\t").map(stripQuotes);
        const name = row[iName];
        const designators = row[iDes].split(/[,\s]+/).filter(Boolean);
        const entry = {
            name,
            footprint: row[iFp],
            mpn: row[iMpn],
            supplier: row[iSup],
            supplierPart: row[iSupPart],
            pins: Number(row[iPins] || 0),
        };
        for (const des of designators) out.set(des, entry);
    }
    return out;
}

// Convert the BOM's "Name" field (e.g. "10nF", "100uF", "100uH", "1kΩ",
// "Red", "Yellow", "SS24", "TPS5430DDAR") into a normalised tscircuit value
// string for a given component kind. Returns null if Name doesn't look like
// a numeric value (color, MPN, etc.).
export function tscircuitValueFromBomName(name, kind) {
    if (!name) return null;
    // Strip the Ω if present.
    const clean = name.replace(/\s*[ΩΟ]\s*$/, "").trim();
    if (kind === "R") {
        // "10K", "10k", "100k", "1k", "75", "150", "820"
        const m = clean.match(/^(\d+(?:\.\d+)?)\s*([kKmMrR]?)$/);
        if (m) {
            const suffix = (m[2] || "").toLowerCase();
            if (suffix === "k") return m[1] + "k";
            if (suffix === "m") return m[1] + "M";
            return m[1];
        }
    }
    if (kind === "C") {
        // "10nF", "470uF", "2.2uF", "100pF"
        const m = clean.match(/^(\d+(?:\.\d+)?)\s*([pnumµM])F?$/i);
        if (m) {
            const u = m[2].toLowerCase().replace("µ", "u");
            return m[1] + u + "F";
        }
    }
    if (kind === "L") {
        // "100uH", "10nH", "1mH"
        const m = clean.match(/^(\d+(?:\.\d+)?)\s*([pnumµM])H?$/i);
        if (m) {
            const u = m[2].toLowerCase().replace("µ", "u");
            return m[1] + u + "H";
        }
    }
    return null;
}
