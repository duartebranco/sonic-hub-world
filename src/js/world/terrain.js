import * as THREE from "three";

export function groundY(x, z) {
    let y = 0;

    // Helper to create a flat, elevated plateau with steep, jumpable walls
    const addPlateau = (px, pz, radius, height) => {
        const dist = Math.sqrt((x - px) ** 2 + (z - pz) ** 2);
        // Sharp transition over 1.5 units to act as a steep wall
        const t = Math.max(0, Math.min(1, (radius - dist) / 1.5 + 0.5));
        const smoothT = t * t * (3 - 2 * t);
        y = Math.max(y, smoothT * height);
    };

    // --- SANDBOX HUB LAYOUT ---

    // Central area is flat at y=0.

    // 1. East Jump Platforms
    addPlateau(35, 0, 12, 3.5); // First jump
    addPlateau(35, 25, 10, 7.0); // Second jump

    // 2. West High Plateau
    addPlateau(-35, 15, 18, 4.0);
    addPlateau(-45, -15, 15, 8.0);

    // 3. Giant Staircase in the North
    const stairDist = Math.max(0, z - 30);
    if (Math.abs(x) < 15 && stairDist > 0) {
        // Steps of height 3, depth 10
        const stepIndex = Math.floor(stairDist / 10);
        const stepLocal = stairDist % 10;
        // Ramp up quickly in the first 2 units of the step, then completely flat
        const t = Math.max(0, Math.min(1, stepLocal / 2.0));
        const smoothT = t * t * (3 - 2 * t);
        const stairY = (stepIndex + smoothT) * 3.0;
        y = Math.max(y, stairY);
    }

    // 4. Slight organic rolling hills in the far south for variety
    if (z < -30 && y < 0.5) {
        const hill = Math.sin(x * 0.1) * Math.sin(z * 0.1) * 2.0;
        if (hill > 0) y = Math.max(y, hill);
    }

    // 5. World boundary wall (keeps the player in the hub)
    const worldDist = Math.sqrt(x * x + z * z);
    if (worldDist > 100) {
        const t = Math.max(0, Math.min(1, (worldDist - 100) / 4.0));
        y += t * t * (3 - 2 * t) * 20.0;
    }

    return y;
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
    // Build a starting plaza in the center of the hub
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
