// Decide the tscircuit JSX element + props for a parsed schematic LIB.
// Returns { tag, props } where:
//   - tag: "resistor" | "capacitor" | "led" | "diode" | "transistor" |
//          "mosfet" | "inductor" | "fuse" | "pushbutton" | "pinheader" |
//          "chip" | "hole" | null (skip)
//   - props: object of JSX props ({ name, footprint, resistance, ... })
//
// The pcbX/pcbY/pcbRotation props are NOT added here — that lives in the
// orchestrator because it needs the board centre.

import {
    resistanceFromMpn,
    capacitanceFromMpn,
    inductanceFromMpn,
} from "./value-parser.mjs";

// Map an EasyEDA package to a tscircuit footprint string. tscircuit accepts
// imperial sizes for SMD passives ("0603", "0805", "1206", …) and named
// footprints for ICs / connectors ("soic8", "sot23", "pinrow6").
function tscircuitFootprint(pkg, lcsc) {
    if (!pkg) return null;
    const p = pkg.toUpperCase();
    let m;
    // Imperial passive
    if ((m = p.match(/^[RC](\d{4})$/))) return m[1];
    if ((m = p.match(/^LED(\d{4})/))) return `led${m[1]}`;
    if (p.startsWith("F1206")) return "1206";
    if (p === "R2512" || p.startsWith("R2512")) return "2512";
    if (p.startsWith("R2010")) return "2010";
    // SOT
    if (/^SOT-?23-?3/.test(p)) return "sot23";
    if (/^SOT-?23-?5/.test(p)) return "sot23_5";
    if (/^SOT-?223/.test(p)) return "sot223";
    // Diodes
    if (p.startsWith("SOD-323") || p.startsWith("SOD323")) return "sod323";
    if (p.startsWith("SMA")) return "sma";
    // ICs
    if (p.startsWith("SOIC-8") || p.startsWith("SOIC8")) return "soic8";
    if (p.startsWith("ESOP-8") || p.startsWith("ESOP8")) return "soic8";
    // Tantalum cases as imperial proxies
    if (p.startsWith("CASE-A")) return "0805";
    if (p.startsWith("CASE-B")) return "1210";
    if (p.startsWith("CASE-C")) return "1411";
    if (p.startsWith("CASE-D")) return "1815";
    if (p.startsWith("CAP-SMD_L3.2-W1.6")) return "1206";
    // Through-hole
    if (p.startsWith("CONN-TH_2P-P5.00") || p.startsWith("WJ500V-5.08-2P")) return "pinrow2_p5.08mm";
    if (p.startsWith("FTDI HEADER")) return "pinrow6";
    if (p.includes("TOOLING HOLE")) return null;
    return null;
}

// Used for LED colour from the EasyEDA package.
function ledColor(pkg) {
    const p = (pkg || "").toUpperCase();
    if (p.includes("YELLOW") || p.includes("YEL")) return "yellow";
    if (p.includes("BLUE") || p.includes("BLU")) return "blue";
    if (p.includes("GREEN") || p.includes("GRN")) return "green";
    if (p.includes("WHITE") || p.includes("WHT")) return "white";
    if (p.includes("ORANGE") || p.includes("ORA")) return "orange";
    return "red";
}

// Heuristics for transistor classification from MPN.
function transistorVariant(mpn) {
    if (!mpn) return null;
    if (/2N7002|AO[0-9]+|BSS|IRF|FDS|SI[0-9]+|SQ[0-9]+/i.test(mpn)) return { tag: "mosfet", channelType: "n" };
    if (/S8550|2N3906|MMBT3906|BC857|PMBT3906/i.test(mpn)) return { tag: "transistor", type: "pnp" };
    if (/S8050|2N3904|MMBT3904|BC847|PMBT3904|BC817/i.test(mpn)) return { tag: "transistor", type: "npn" };
    return { tag: "transistor", type: "npn" };
}

export function pickTscircuit(lib, designator) {
    const pkg = lib.package || "";
    const mpn = lib.mpn || "";
    const lcsc = lib.lcsc || "";
    const spicePre = (lib.spicePre || "").toUpperCase();
    const fp = tscircuitFootprint(pkg, lcsc);

    const baseProps = {
        name: designator,
        ...(fp ? { footprint: fp } : {}),
        ...(mpn ? { manufacturerPartNumber: mpn } : {}),
        ...(lcsc ? { supplierPartNumbers: { jlcpcb: [lcsc] } } : {}),
    };

    // LEDs (any package starting LED####). Two important touches:
    //  - bare imperial footprint ("0603", not "led0603") because the
    //    `led0603` footprinter requires explicit pad-dimension params;
    //  - connection key hints map EasyEDA pin numbers (pin1 = cathode,
    //    pin2 = anode for the standard SMD orientation) to tscircuit's
    //    semantic `neg`/`pos` keys, which makes the viewer render the LED
    //    in its actual colour instead of plain grey.
    if (/^LED\d{4}/i.test(pkg)) {
        const sizeMatch = pkg.match(/^LED(\d{4})/i);
        const ledFp = sizeMatch ? sizeMatch[1] : "0603";
        // Strip manufacturerPartNumber / supplierPartNumbers from LEDs —
        // tscircuit's <led> primitive otherwise tries to use the
        // EasyEDA-style external model and overrides the coloured dome
        // rendered by the footprinter. The li-charger example shows that
        // bare `<led color="red" footprint="0603" />` is the recipe for a
        // properly tinted LED in the 3D view.
        return {
            tag: "led",
            props: { name: baseProps.name, footprint: ledFp, color: ledColor(pkg) },
            connectionKeyHints: { "1": "neg", "2": "pos" },
        };
    }

    if (spicePre === "R") {
        return { tag: "resistor", props: { ...baseProps, resistance: resistanceFromMpn(mpn) ?? "0" } };
    }
    if (spicePre === "C") {
        // Standard SMD ceramic / tantalum (0603/0805/1206/1210/etc.) → real
        // <capacitor> primitive with footprinter-driven 3D.
        // Radial electrolytics / odd packages (no imperial fp) → <chip> so
        // the inline footprint drives an axis-aligned cuboid in 3D, since
        // <capacitor> doesn't currently auto-extrude.
        if (fp) return { tag: "capacitor", props: { ...baseProps, capacitance: capacitanceFromMpn(mpn) ?? "0" } };
        return { tag: "chip", props: baseProps };
    }
    if (spicePre === "L") {
        // 4-pin common-mode chokes → chip (inductor primitive is 2-pin).
        if (/ACT45/i.test(mpn) || /CHOKE/i.test(pkg)) {
            return { tag: "chip", props: baseProps };
        }
        // Inductors with no standard imperial footprint (custom SMD bodies
        // like SMMS0650) fall back to <chip> so the inline footprint actually
        // drives both the PCB pads and the 3D body. <inductor>'s primitive
        // doesn't currently absorb inline-footprint pads cleanly — its pin1/
        // pin2 ports stay unconnected and we get "missing trace" warnings.
        if (!fp) return { tag: "chip", props: baseProps };
        return { tag: "inductor", props: { ...baseProps, inductance: inductanceFromMpn(mpn) ?? "0" } };
    }
    if (spicePre === "F") {
        // <fuse> primitive doesn't propagate supplierPartNumbers to the BOM
        // viewer cleanly. Use <chip> so the manufacturer/jlcpcb refs land in
        // the BOM. We keep currentRating as a free-text prop for reference.
        const ir = /nSMD005/i.test(mpn) ? "0.5A" : "1A";
        return { tag: "chip", props: { ...baseProps, currentRating: ir } };
    }
    if (spicePre === "D") {
        return { tag: "diode", props: { ...baseProps, variant: "schottky" } };
    }
    if (spicePre === "Q") {
        const t = transistorVariant(mpn);
        // MOSFETs: tscircuit's own footprint imports (li-charger A_8205A.tsx)
        // use <chip> with pinLabels rather than the <mosfet> primitive — the
        // primitive's gate/source/drain auto-aliases don't currently route
        // correctly with SOT-23-3. We follow the same convention.
        if (t.tag === "mosfet") return {
            tag: "chip",
            props: {
                ...baseProps,
                pinLabels: { pin1: ["G"], pin2: ["S"], pin3: ["D"] },
            },
            connectionKeyHints: { "1": "G", "2": "S", "3": "D" },
        };
        // BJTs: same chip pattern so supplierPartNumbers reaches the BOM,
        // with base/emitter/collector pinLabels for a readable schematic.
        return {
            tag: "chip",
            props: {
                ...baseProps,
                pinLabels: { pin1: ["B"], pin2: ["E"], pin3: ["C"] },
            },
            connectionKeyHints: { "1": "B", "2": "E", "3": "C" },
        };
    }
    // Switches / pushbuttons. EasyEDA uses `spicePre = "S"` for them.
    // The <pushbutton> primitive doesn't currently extrude a 3D body from
    // the inline footprint, so use <chip> for consistent rendering.
    if (spicePre === "S" || spicePre === "SW") {
        return { tag: "chip", props: baseProps };
    }
    // FTDI HEADER: the board exposes 6 plated-through holes for the user
    // to optionally hand-solder a header later. It's NOT a real component
    // — it must not appear in the BOM and shouldn't be placed by the
    // factory. We emit it as a <chip> with inline plated holes, no MPN,
    // and `doNotPlace` so tscircuit/JLCPCB skip it during assembly.
    if (pkg.toUpperCase().startsWith("FTDI HEADER")) {
        return {
            tag: "chip",
            props: { name: baseProps.name, doNotPlace: true },
            skipCadModel: true,
        };
    }
    // Terminal block (WJ500V) — pinheader renders as bare pins which doesn't
    // resemble the real block. Use a <chip> with the inline footprint so the
    // viewer draws a cuboid sized to the actual body.
    if (pkg.startsWith("CONN-TH_2P") || pkg.startsWith("WJ500V")) {
        return { tag: "chip", props: baseProps };
    }
    // ICs
    if (spicePre === "U" || spicePre === "P") {
        return { tag: "chip", props: baseProps };
    }
    // Tooling hole / no-LCSC, no spicePre
    if (/TOOLING HOLE/i.test(pkg)) {
        return { tag: "hole", props: { name: designator, diameter: "2.2677mm" } };
    }

    return null;
}
