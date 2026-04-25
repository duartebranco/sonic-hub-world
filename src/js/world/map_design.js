import * as THREE from "three";

// Blue Ridge Speedway — a loopable counter-clockwise circuit:
//   Hub (0,0) → north sprint + launch ramp → NE highland → east straight →
//   east lake (jump shortcut) → SE mound → south return → west section →
//   NW pond → back to hub.
//
// Two "breakable" shortcuts:
//   1. North launch ramp (8, -30): at spin-dash speed the player clears the NE
//      highland (height 12) and lands past it — skipping the highland climb.
//      At run speed the arc barely touches the slope; must go around.
//   2. East lake ramp (40, 22): at max speed the player jumps over the east lake
//      entirely. At run speed the arc falls short and the player lands in the lake.

export const MAP_CONFIG = {
    worldRadius: 110,
    hubRadius: 25,

    plateaus: [
        // NE highland — main shortcut obstacle; clears at ~42 u/s from launch ramp
        { x: 45, z: -65, radius: 22, height: 12 },
        // NW hill — natural chicane on the return leg
        { x: -55, z: -50, radius: 18, height: 9 },
        // SE mound — elevation variety at the south-east bend
        { x: 55, z: 58, radius: 20, height: 10 },
        // SW mound — mirrors SE, guides the south-west return
        { x: -45, z: 55, radius: 16, height: 7 },
    ],

    // facing: the HIGH end of the slope faces this direction.
    // A north-facing ramp rises northward; player approaches from the south.
    ramps: [
        // PRIMARY LAUNCH RAMP — the Emerald-Coast moment.
        // Tip at z ≈ -46.  At ~42 u/s: clears NE highland (h=12), lands at z ≈ -103.
        // At run speed (~24 u/s): arc peaks at h ≈ 8.7, hits highland slope → must detour.
        { x: 5, z: -30, width: 18, length: 32, height: 8, facing: "north" },

        // East lake speed-jump — faces east over the east lake.
        // At max speed: clears the lake and lands on far side (shortcut reward).
        // At run speed: falls into the lake near the far edge.
        { x: 40, z: 22, width: 40, length: 14, height: 7, facing: "east" },

        // SE descent — helps the player curve back west off the SE mound.
        { x: 65, z: 62, width: 14, length: 36, height: 8, facing: "south" },

        // West return launch — faces west, sends the player back toward the hub
        // from the south-west corner at speed.
        { x: -35, z: 72, width: 14, length: 36, height: 7, facing: "west" },
    ],

    lakes: [
        // East lake — the water obstacle for the east speed-jump shortcut.
        { x: 78, z: 25, radius: 16, depth: 8 },
        // NW pond — obstacle on the north-west return leg.
        { x: -68, z: -38, radius: 13, depth: 7 },
    ],

    trenches: [
        // West-side gap — adds a small skill-check on the return leg.
        { x: -55, z: 20, width: 12, length: 10, depth: 5 },
    ],

    waterPlanes: [
        { x: 78, y: -1.5, z: 25, width: 46, length: 46 },
        { x: -68, y: -1.5, z: -38, width: 40, length: 40 },
    ],

    bridges: [
        // Decorative bridge over east lake (normal path)
        { x: 78, y: -0.5, z: 25, length: 28, width: 8, spanAxis: "z" },
        // Decorative bridge over NW pond
        { x: -68, y: -0.5, z: -38, length: 22, width: 8, spanAxis: "z" },
    ],

    mobs: [
        { type: "motobug", x: 30, z: -60, patrolRadius: 6.0 },  // NE highland approach
        { type: "motobug", x: 72, z: -38, patrolRadius: 5.0 },  // east straight north
        { type: "motobug", x: 75, z: 8, patrolRadius: 5.0 },    // east straight south
        { type: "motobug", x: -38, z: 55, patrolRadius: 6.0 },  // SW section
        { type: "motobug", x: -72, z: -15, patrolRadius: 5.0 }, // NW section
        { type: "motobug", x: 5, z: -78, patrolRadius: 5.0 },   // far-north shortcut lane
    ],
};

export function groundY(x, z) {
    let y = 0;
    const distOrigin = Math.sqrt(x * x + z * z);

    if (distOrigin < MAP_CONFIG.hubRadius) {
        y = Math.max(y, 0);
    }

    for (const p of MAP_CONFIG.plateaus) {
        const dist = Math.sqrt((x - p.x) ** 2 + (z - p.z) ** 2);
        const transition = Math.max(0, Math.min(1, (p.radius - dist) / 2.0 + 0.5));
        if (transition > 0) {
            const smooth = transition * transition * (3 - 2 * transition);
            y = Math.max(y, smooth * p.height);
        }
    }

    for (const r of MAP_CONFIG.ramps) {
        const hw = r.width / 2.0;
        const hl = r.length / 2.0;
        if (x > r.x - hw && x < r.x + hw && z > r.z - hl && z < r.z + hl) {
            let t = 0;
            if (r.facing === "north") t = (r.z + hl - z) / r.length;
            else if (r.facing === "south") t = (z - (r.z - hl)) / r.length;
            else if (r.facing === "east") t = (x - (r.x - hw)) / r.width;
            else if (r.facing === "west") t = (r.x + hw - x) / r.width;
            if (t > 0) y = Math.max(y, t * t * r.height);
        }
    }

    if (distOrigin > MAP_CONFIG.worldRadius) {
        const t = Math.max(0, Math.min(1, (distOrigin - MAP_CONFIG.worldRadius) / 10.0));
        if (t > 0) y = Math.max(y, t * t * (3 - 2 * t) * 40.0);
    }

    for (const lake of MAP_CONFIG.lakes) {
        const dist = Math.sqrt((x - lake.x) ** 2 + (z - lake.z) ** 2);
        if (dist < lake.radius) {
            y -= Math.cos(((dist / lake.radius) * Math.PI) / 2) * lake.depth;
        }
    }

    for (const t of MAP_CONFIG.trenches) {
        const hw = t.width / 2.0;
        const hl = t.length / 2.0;
        if (x > t.x - hw && x < t.x + hw && z > t.z - hl && z < t.z + hl) {
            y = Math.min(y, -t.depth);
        }
    }

    return y;
}

export function buildMapObjects(scene) {
    const waterMat = new THREE.MeshStandardMaterial({
        color: 0x1ca3ec,
        transparent: true,
        opacity: 0.75,
        roughness: 0.1,
        metalness: 0.2,
    });

    for (const w of MAP_CONFIG.waterPlanes) {
        const geo = new THREE.PlaneGeometry(w.width, w.length);
        geo.rotateX(-Math.PI / 2);
        const mesh = new THREE.Mesh(geo, waterMat);
        mesh.position.set(w.x, w.y, w.z);
        scene.add(mesh);
    }

    const woodMat = new THREE.MeshStandardMaterial({ color: 0x8b5a2b, roughness: 0.9 });

    for (const b of MAP_CONFIG.bridges) {
        const group = new THREE.Group();
        group.position.set(b.x, b.y, b.z);

        const isX = b.spanAxis === "x";
        const plankW = isX ? 1.5 : b.width;
        const plankL = isX ? b.width : 1.5;
        const plankGeo = new THREE.BoxGeometry(plankW, 0.4, plankL);
        const halfLen = b.length / 2.0;
        const halfWid = b.width / 2.0;

        for (let i = -halfLen; i <= halfLen; i += 2.0) {
            const plank = new THREE.Mesh(plankGeo, woodMat);
            const arch = Math.cos((i / halfLen) * Math.PI * 0.5) * 2.0;
            if (isX) plank.position.set(i, arch, 0);
            else plank.position.set(0, arch, i);
            plank.castShadow = true;
            plank.receiveShadow = true;
            group.add(plank);
        }

        const railGeo = isX
            ? new THREE.BoxGeometry(b.length + 2, 0.4, 0.4)
            : new THREE.BoxGeometry(0.4, 0.4, b.length + 2);
        const rail1 = new THREE.Mesh(railGeo, woodMat);
        const rail2 = new THREE.Mesh(railGeo, woodMat);
        if (isX) {
            rail1.position.set(0, 1.5, -halfWid + 0.2);
            rail2.position.set(0, 1.5, halfWid - 0.2);
        } else {
            rail1.position.set(-halfWid + 0.2, 1.5, 0);
            rail2.position.set(halfWid - 0.2, 1.5, 0);
        }
        group.add(rail1, rail2);

        const postGeo = new THREE.BoxGeometry(0.5, 2.5, 0.5);
        for (let i = -halfLen; i <= halfLen; i += 6.0) {
            const arch = Math.cos((i / halfLen) * Math.PI * 0.5) * 2.0;
            const p1 = new THREE.Mesh(postGeo, woodMat);
            const p2 = new THREE.Mesh(postGeo, woodMat);
            if (isX) {
                p1.position.set(i, arch + 0.5, -halfWid + 0.2);
                p2.position.set(i, arch + 0.5, halfWid - 0.2);
            } else {
                p1.position.set(-halfWid + 0.2, arch + 0.5, i);
                p2.position.set(halfWid - 0.2, arch + 0.5, i);
            }
            p1.castShadow = true;
            p2.castShadow = true;
            group.add(p1, p2);
        }

        scene.add(group);
    }
}

export function isPointOccupied(x, z) {
    if (Math.sqrt(x * x + z * z) < MAP_CONFIG.hubRadius) return true;

    for (const lake of MAP_CONFIG.lakes) {
        if (Math.sqrt((x - lake.x) ** 2 + (z - lake.z) ** 2) < lake.radius) return true;
    }

    for (const t of MAP_CONFIG.trenches) {
        if (Math.abs(x - t.x) < t.width / 2.0 && Math.abs(z - t.z) < t.length / 2.0) return true;
    }

    for (const r of MAP_CONFIG.ramps) {
        if (Math.abs(x - r.x) < r.width / 2.0 && Math.abs(z - r.z) < r.length / 2.0) return true;
    }

    for (const b of MAP_CONFIG.bridges) {
        const w = b.spanAxis === "x" ? b.length : b.width;
        const l = b.spanAxis === "x" ? b.width : b.length;
        if (Math.abs(x - b.x) < w / 2.0 && Math.abs(z - b.z) < l / 2.0) return true;
    }

    return false;
}
