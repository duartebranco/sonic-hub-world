import { MAP_CONFIG } from "./map_design.js";

export const WORLD_RADIUS = MAP_CONFIG.worldRadius;

// bridge surface data for physics-only ground height (does not affect terrain mesh)
export const BRIDGE_SURFACES = MAP_CONFIG.bridges.map((b) => ({ ...b }));

// {x, z, radius}
export const CYLINDER_COLLIDERS = MAP_CONFIG.trees.map((t) => ({
    x: t.x,
    z: t.z,
    radius: 0.35 * (t.scale ?? 1.0),
}));

// {x, z, hw, hl} axis-aligned half-extents for bridge rails
export const BOX_COLLIDERS = [];

for (const b of MAP_CONFIG.bridges) {
    const halfLen = b.length / 2;
    const halfWid = b.width / 2;
    const railThick = 0.3;
    if (b.spanAxis === "x") {
        BOX_COLLIDERS.push({ x: b.x, z: b.z - halfWid, hw: halfLen + 1, hl: railThick });
        BOX_COLLIDERS.push({ x: b.x, z: b.z + halfWid, hw: halfLen + 1, hl: railThick });
    } else {
        BOX_COLLIDERS.push({ x: b.x - halfWid, z: b.z, hw: railThick, hl: halfLen + 1 });
        BOX_COLLIDERS.push({ x: b.x + halfWid, z: b.z, hw: railThick, hl: halfLen + 1 });
    }
}
