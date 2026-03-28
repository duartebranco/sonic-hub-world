import * as THREE from "three";
import { groundY as mapGroundY, buildMapObjects } from "./map_design.js";

// Re-export groundY so that physics and other modules continue to work
export function groundY(x, z) {
    return mapGroundY(x, z);
}

export function buildTerrain(scene) {
    // 300x300 world with high subdivision to clearly render steep walls
    const geo = new THREE.PlaneGeometry(300, 300, 300, 300);
    geo.rotateX(-Math.PI / 2);

    const pos = geo.attributes.position;
    const cols = new Float32Array(pos.count * 3);

    for (let i = 0; i < pos.count; i++) {
        const x = pos.getX(i);
        const z = pos.getZ(i);
        const y = groundY(x, z);
        pos.setY(i, y);

        // Checkerboard grid sizing
        const cx = Math.floor(x / 4);
        const cz = Math.floor(z / 4);
        const even = (cx + cz) % 2 === 0;

        // Detect steep slopes to color them as cliff faces
        const dx = groundY(x + 0.5, z) - y;
        const dz = groundY(x, z + 0.5) - y;
        const slope = Math.sqrt(dx * dx + dz * dz) / 0.5;

        // Subtle height-based brightness
        const t = Math.max(0, Math.min(1, y / 20));

        if (slope > 0.8) {
            // Cliff walls (dirt/rock brown)
            cols[i * 3] = 0.55 + t * 0.1;
            cols[i * 3 + 1] = 0.35 + t * 0.1;
            cols[i * 3 + 2] = 0.15 + t * 0.1;
        } else {
            // Flat runnable plains (classic green checkerboard)
            if (even) {
                cols[i * 3] = 0.2;
                cols[i * 3 + 1] = 0.65 + t * 0.1;
                cols[i * 3 + 2] = 0.15;
            } else {
                cols[i * 3] = 0.15;
                cols[i * 3 + 1] = 0.55 + t * 0.1;
                cols[i * 3 + 2] = 0.1;
            }
        }
    }

    geo.setAttribute("color", new THREE.BufferAttribute(cols, 3));
    geo.computeVertexNormals();

    const mat = new THREE.MeshStandardMaterial({
        vertexColors: true,
        roughness: 0.85,
        metalness: 0.0,
    });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.receiveShadow = true;
    scene.add(mesh);
}

export function buildPath(scene) {
    // 1. Build the explicit map objects (Water, Bridges, etc.) from map_design.js
    buildMapObjects(scene);

    // 2. Build a starting plaza in the center of the hub
    const matA = new THREE.MeshStandardMaterial({
        color: 0xfff9e6,
        roughness: 0.55,
    });
    const matB = new THREE.MeshStandardMaterial({
        color: 0x26c6da,
        roughness: 0.55,
    });

    const S = 2.0;
    const geo = new THREE.BoxGeometry(S, 0.14, S);
    const RADIUS = 6;

    for (let r = -RADIUS; r <= RADIUS; r++) {
        for (let c = -RADIUS; c <= RADIUS; c++) {
            // Make it circular
            if (r * r + c * c > RADIUS * RADIUS) continue;

            const x = c * S;
            const z = r * S;
            const y = groundY(x, z) + 0.05;

            const mat = (Math.abs(r) + Math.abs(c)) % 2 === 0 ? matA : matB;
            const m = new THREE.Mesh(geo, mat);
            m.position.set(x, y, z);
            m.receiveShadow = true;
            scene.add(m);
        }
    }
}
