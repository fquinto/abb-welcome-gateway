// Parse the PADS-PCB netlist (`*PADS-PCB*` header) exported from EasyEDA.
// This is the canonical source of truth for the project's connectivity —
// every signal has an explicit name plus a list of component.pin members.
//
// Returns:
//   - netByPin: Map<"<designator>.<pinNumber>", "<netName>">
//   - pinsByNet: Map<"<netName>", string[]>  e.g. "EN" → ["U2.3","R10.1",…]
//   - components: Map<"<designator>", "<packageName>">  from the *PART* section

import fs from "node:fs";

export function parsePadsNetlist(filePath) {
    const text = fs.readFileSync(filePath, "utf8");
    const lines = text.split(/\r?\n/);

    const components = new Map();
    const netByPin = new Map();
    const pinsByNet = new Map();

    let section = null;          // "PART" | "NET" | null
    let currentNet = null;       // signal name we're collecting pins into

    for (const raw of lines) {
        const line = raw.trim();
        if (!line) continue;
        if (line === "*PADS-PCB*" || line === "*END*") continue;
        if (line === "*PART*") { section = "PART"; continue; }
        if (line === "*NET*") { section = "NET"; continue; }
        if (line.startsWith("*SIGNAL*")) {
            currentNet = line.replace(/^\*SIGNAL\*\s*/, "").trim();
            if (!pinsByNet.has(currentNet)) pinsByNet.set(currentNet, []);
            continue;
        }

        if (section === "PART") {
            // "<designator> <package>"
            const m = line.match(/^(\S+)\s+(.+)$/);
            if (m) components.set(m[1], m[2]);
            continue;
        }

        if (section === "NET" && currentNet) {
            // space-separated tokens, each "<designator>.<pinNumber>"
            for (const tok of line.split(/\s+/)) {
                if (!tok || !tok.includes(".")) continue;
                netByPin.set(tok, currentNet);
                pinsByNet.get(currentNet).push(tok);
            }
        }
    }

    return { components, netByPin, pinsByNet };
}

// Convenience: net name for a single pin.
export function netFor(netlist, designator, pinNumber) {
    return netlist.netByPin.get(`${designator}.${pinNumber}`) ?? null;
}

// tscircuit rejects net names beginning with a digit. PADS happily produces
// "3V3" — we sanitise to "V3V3" the same way the rest of the pipeline does.
export function sanitizeNet(name) {
    if (!name) return name;
    return /^\d/.test(name) ? `V${name}` : name;
}
