import { MAP_CONFIG, groundY } from "./map_design.js";

export const WORLD_RADIUS = MAP_CONFIG.worldRadius;

// bridge surface data for physics-only ground height (does not affect terrain mesh)
export const BRIDGE_SURFACES = MAP_CONFIG.bridges.map((b) => ({ ...b }));

// {x, z, radius, baseY, topY} — topY matches actual tree geometry (6 segments + canopy)
export const CYLINDER_COLLIDERS = MAP_CONFIG.trees.map((t) => {
    const sc = t.scale ?? 1.0;
    const base = groundY(t.x, t.z);
    return {
        x: t.x,
        z: t.z,
        radius: 0.35 * sc,
        baseY: base,
        topY: base + 6.1 * sc,
    };
});

