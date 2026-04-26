import * as THREE from "three";

export const MAP_CONFIG = {
    worldRadius: 133,
    hubRadius: 9,

    plateaus: [
        { x: 0.75, z: 94.88, radius: 15, height: 4.5 },
        { x: -0.66, z: 125.32, radius: 18, height: 9 },
        { x: -75.24, z: -93.79, radius: 17.5, height: 8 },
        { x: 25.7, z: 113.97, radius: 22.5, height: 14.5 },
        { x: -32.28, z: -48.71, radius: 15.5, height: 5 },
        { x: 104.55, z: -68.16, radius: 12, height: 5 },
        { x: 112.67, z: -57.51, radius: 12, height: 5 },
        { x: 96.75, z: -81.29, radius: 12, height: 5 },
        { x: 85.42, z: -94.09, radius: 12, height: 5 },
        { x: 72.76, z: -105.86, radius: 12, height: 10.5 },
        { x: 82.92, z: -80.37, radius: 12, height: 5 },
        { x: 98.56, z: -55.73, radius: 12, height: 5 },
        { x: 89.03, z: -67.5, radius: 12, height: 5 },
    ],

    ramps: [
        { x: 24.91, z: 18.86, width: 28.5, length: 79.5, height: 11, facing: "south" },
        { x: -98.67, z: 7.05, width: 30, length: 60, height: 4, facing: "east" },
    ],

    lakes: [
        { x: -31.5, z: -99.5, radius: 40, depth: 8 },
        { x: 25, z: -104.5, radius: 45.5, depth: 9 },
    ],

    trenches: [
        { x: -56.15, z: -1.5, width: 52, length: 268.5, depth: 7.5 },
    ],

    waterPlanes: [
        { x: -2, y: -2.5, z: 2, width: 266, length: 293 },
    ],

    bridges: [
        { x: -56.22, y: -0.5, z: 62.64, length: 59.5, width: 6, spanAxis: "x" },
    ],

    mobs: [
        { type: "motobug", x: 88.54, z: 16.39, patrolRadius: 5 },
        { type: "motobug", x: 87.03, z: 55.53, patrolRadius: 5 },
        { type: "motobug", x: 74.11, z: 35.54, patrolRadius: 5 },
        { type: "motobug", x: 72.34, z: -0.56, patrolRadius: 5 },
        { type: "motobug", x: 86.5, z: -21.98, patrolRadius: 5 },
        { type: "motobug", x: 72.61, z: 73.94, patrolRadius: 5 },
        { type: "motobug", x: -81.15, z: -98.49, patrolRadius: 5 },
        { type: "motobug", x: -123.07, z: 3.73, patrolRadius: 5 },
        { type: "motobug", x: -107.05, z: -56.43, patrolRadius: 5 },
        { type: "motobug", x: -96.24, z: 50.33, patrolRadius: 5 },
        { type: "motobug", x: -97.45, z: -33.33, patrolRadius: 5 },
        { type: "motobug", x: -37.73, z: -51.75, patrolRadius: 5 },
    ],

    trees: [
        { x: -106.22, z: 71.81, scale: 1 },
        { x: -113.47, z: 51.62, scale: 1 },
        { x: -112.69, z: 60.7, scale: 1 },
        { x: -104.72, z: 62.22, scale: 1 },
        { x: -96.56, z: 74.36, scale: 1 },
        { x: -119.77, z: 48.02, scale: 1 },
        { x: -95.88, z: 85.14, scale: 1 },
        { x: -88.56, z: 93.03, scale: 1 },
        { x: 89.39, z: 89.36, scale: 1 },
        { x: 58.43, z: 109.91, scale: 1 },
        { x: 54.29, z: 96.33, scale: 1 },
        { x: 66.99, z: 101.73, scale: 1 },
        { x: 43.43, z: 86.82, scale: 1 },
        { x: 32.76, z: 82.75, scale: 1 },
        { x: 79.09, z: 96.34, scale: 1 },
        { x: 99.2, z: 79.34, scale: 1 },
        { x: 22.53, z: 80.78, scale: 1 },
        { x: 126.18, z: -24.09, scale: 1 },
        { x: 128.46, z: -4.06, scale: 1 },
        { x: 127.17, z: 18.16, scale: 1 },
        { x: 121.28, z: 42.53, scale: 1 },
        { x: 114.79, z: -34.47, scale: 1 },
        { x: 117.06, z: -12.97, scale: 1 },
        { x: 118.55, z: 6.39, scale: 1 },
        { x: 114.81, z: 27.4, scale: 1 },
        { x: 111.39, z: 54.92, scale: 1 },
        { x: 105.23, z: -23.45, scale: 1 },
        { x: 104.83, z: 40.38, scale: 1 },
        { x: 106.21, z: -2.59, scale: 1 },
        { x: 104.88, z: 20.01, scale: 1 },
        { x: 98.38, z: 63.86, scale: 1 },
        { x: 118.32, z: -55.44, scale: 1 },
        { x: 111.29, z: -65.64, scale: 1 },
        { x: 103.95, z: -77.15, scale: 1 },
        { x: 97.35, z: -86.22, scale: 1 },
        { x: 88.56, z: -94.88, scale: 1 },
        { x: 95.12, z: -77.21, scale: 1 },
        { x: 86.87, z: -85.23, scale: 1 },
        { x: 100.77, z: -66.81, scale: 1 },
        { x: 107.46, z: -56.07, scale: 1 },
        { x: 79.46, z: -105.35, scale: 1 },
        { x: 70.33, z: -111.42, scale: 1 },
        { x: 97.16, z: -50.25, scale: 1 },
        { x: 69.51, z: -102.17, scale: 1 },
    ],

    flowers: [
        { x: 62.99, z: -68.01 },
        { x: 8.52, z: -40.12 },
        { x: 26.34, z: -51.43 },
        { x: 71.11, z: -50.73 },
        { x: 49.5, z: -55.6 },
        { x: 59.57, z: -41.57 },
        { x: 71.77, z: -29.1 },
        { x: 58.13, z: -22.86 },
        { x: 41.05, z: -35.08 },
        { x: 23.59, z: -36.15 },
        { x: -0.58, z: -53.26 },
        { x: -8.54, z: -36.88 },
        { x: -5.03, z: -23.6 },
        { x: -22.43, z: -14.78 },
        { x: -6.4, z: -6.92 },
        { x: -22.5, z: 6.36 },
        { x: -6.45, z: 13.57 },
        { x: -23.22, z: 23.85 },
        { x: -5.97, z: 34.28 },
        { x: -23.41, z: 43.67 },
        { x: -5.4, z: 72.54 },
        { x: -23.31, z: 61.35 },
        { x: -23.58, z: 85.09 },
        { x: -18.79, z: 108.38 },
        { x: -24.7, z: 125.89 },
        { x: 45.64, z: -6.92 },
        { x: 57.16, z: 4.06 },
        { x: -4.46, z: 53.59 },
        { x: 45.52, z: 14.78 },
        { x: 58.3, z: 26.95 },
        { x: 45.13, z: 35.72 },
        { x: 58.17, z: 47.99 },
        { x: 45.36, z: 60.72 },
        { x: 58.08, z: 69.4 },
        { x: 63.1, z: 87.55 },
        { x: 88.09, z: 76.17 },
        { x: 83.82, z: -38.44 },
    ],

    rings: [
        { x: 25, z: 100.5 },
        { x: 21.4, z: 100.5 },
        { x: 29, z: 100.5 },
        { x: -3.5, z: 93.5 },
        { x: 3.5, z: 93.5 },
        { x: 0, z: 93.5 },
        { x: -3.8, z: 127.5 },
        { x: 2, z: 127.5 },
        { x: -9, z: 127.5 },
        { x: 25, z: 104 },
        { x: 25, z: 108 },
        { x: 21.5, z: 104 },
        { x: 18, z: 100.5 },
        { x: 29, z: 104 },
        { x: 32.5, z: 100.5 },
        { x: -20, z: -50.5 },
        { x: -23.5, z: -45 },
        { x: -27, z: -39.5 },
        { x: -70.5, z: -80 },
        { x: -66.5, z: -88 },
        { x: -63, z: -95.5 },
        { x: -91.5, z: -62.4 },
        { x: -91.5, z: -57.5 },
        { x: -91.5, z: -52 },
        { x: -91.5, z: -46.5 },
        { x: -91.5, z: -41.5 },
        { x: -111.5, z: -17.5 },
        { x: -111.5, z: -12.5 },
        { x: -111.5, z: -7 },
        { x: -111.5, z: -2 },
        { x: -111.5, z: 3.5 },
        { x: -111.5, z: 9 },
        { x: -111.5, z: 14.5 },
        { x: -111.5, z: 20 },
        { x: -111.5, z: 25 },
        { x: -111.5, z: 30.5 },
        { x: 25, z: 13.6 },
        { x: 25, z: -18 },
        { x: 25, z: -12.5 },
        { x: 25, z: -7 },
        { x: 25, z: 50.5 },
        { x: 25, z: -2 },
        { x: 25, z: 45 },
        { x: 25, z: 39.5 },
        { x: 25, z: 34 },
        { x: 25, z: 29 },
        { x: 25, z: 23.5 },
        { x: 25, z: 18 },
        { x: 25, z: 3.5 },
        { x: 25, z: 9 },
    ],

    walls: [],
};

export function groundY(x, z) {
    let y = 0;
    const distOrigin = Math.sqrt(x * x + z * z);

    if (distOrigin < MAP_CONFIG.hubRadius) {
        y = Math.max(y, 0);
    }

    // compute plateau influence first — used to guard lower-priority features
    let plateauY = 0;
    for (const p of MAP_CONFIG.plateaus) {
        const dist = Math.sqrt((x - p.x) ** 2 + (z - p.z) ** 2);
        const transition = Math.max(0, Math.min(1, (p.radius - dist) / 2.0 + 0.5));
        if (transition > 0) {
            const smooth = transition * transition * (3 - 2 * transition);
            plateauY = Math.max(plateauY, smooth * p.height);
        }
    }
    y = Math.max(y, plateauY);

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

    // lakes and trenches only apply where no plateau exists
    if (plateauY === 0) {
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
    }

    // world radius wall wins over everything — applied last
    if (distOrigin > MAP_CONFIG.worldRadius) {
        const t = Math.max(0, Math.min(1, (distOrigin - MAP_CONFIG.worldRadius) / 10.0));
        if (t > 0) y = Math.max(y, t * t * (3 - 2 * t) * 40.0);
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
