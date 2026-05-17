// Hand-crafted footprints for components that have no LCSC entry in the
// EasyEDA library and therefore aren't in our `.tmp/components/` cache.
// Returns a JSX `<footprint>` string ready to drop into a `footprint={…}`
// prop. The orientation matches the EasyEDA "rotation 0" footprint — the
// pcbRotation prop on the parent chip rotates it on the board.

const HDR_OUTER = "1.88mm"; // 74 mil — 2.54 mm header pad
const HDR_HOLE = "1.30mm"; // 51 mil — header pin drill
const PITCH_MM = 2.54;

function ftdiHeader6() {
    const pads = [];
    for (let i = 0; i < 6; i++) {
        const pinNumber = i + 1;
        const y = -2.54 * 2.5 + i * PITCH_MM; // -6.35 → +6.35 mm
        pads.push(
            `      <platedhole portHints={["pin${pinNumber}"]} pcbX="0mm" pcbY="${y.toFixed(3)}mm" shape="circle" outerDiameter="${HDR_OUTER}" holeDiameter="${HDR_HOLE}" />`
        );
    }
    return `<footprint>\n${pads.join("\n")}\n    </footprint>`;
}

// Dispatch by EasyEDA package name. Returns null if we don't know one.
export function manualFootprintJSX(pkg) {
    if (!pkg) return null;
    const p = pkg.toUpperCase();
    if (p === "FTDI HEADER") return ftdiHeader6();
    return null;
}
