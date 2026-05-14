import * as THREE from "three";
import { MAP_CONFIG } from "./world/map_design.js";
import { CYLINDER_COLLIDERS, WORLD_RADIUS } from "./world/colliders.js";

// bridge rails are XZ-only (no height check), shown as tall columns
const RAIL_COL_HEIGHT = 40;

let debugGroup = null;
let active = false;

function mat(color) {
    return new THREE.MeshBasicMaterial({ color, wireframe: true });
}

export function setupDebug(scene) {
    debugGroup = new THREE.Group();
    debugGroup.visible = false;

    // plateaus — green cylinders (exact radius and height step in groundY)
    const plMat = mat(0x00ff44);
    for (const p of MAP_CONFIG.plateaus) {
        const geo = new THREE.CylinderGeometry(p.radius, p.radius, p.height, 32, 1);
        const mesh = new THREE.Mesh(geo, plMat);
        mesh.position.set(p.x, p.height / 2, p.z);
        debugGroup.add(mesh);
    }

    // ramps — yellow boxes (footprint + max height)
    const rampMat = mat(0xffff00);
    for (const r of MAP_CONFIG.ramps) {
        const geo = new THREE.BoxGeometry(r.width, r.height, r.length);
        const mesh = new THREE.Mesh(geo, rampMat);
        mesh.position.set(r.x, r.height / 2, r.z);
        debugGroup.add(mesh);
    }

    // tree cylinder colliders — red, height-bounded to match actual tree geometry
    const treeMat = mat(0xff2222);
    for (const c of CYLINDER_COLLIDERS) {
        const h = c.topY - c.baseY;
        const geo = new THREE.CylinderGeometry(c.radius, c.radius, h, 12, 1);
        const mesh = new THREE.Mesh(geo, treeMat);
        mesh.position.set(c.x, c.baseY + h / 2, c.z);
        debugGroup.add(mesh);
    }

    // bridge rails — orange infinite columns (XZ-only, no height check in physics)
    // bridge surface — cyan flat box at arch heights
    const railMat = mat(0xff8800);
    const bridgeMat = mat(0x00ffff);
    for (const b of MAP_CONFIG.bridges) {
        const halfLen = b.length / 2;
        const halfWid = b.width / 2;
        const railThick = 0.3;

        // walkable arch surface: spans b.y+0.2 (ends) to b.y+2.2 (center)
        const surfGeo = new THREE.BoxGeometry(b.length, 2.0, b.width);
        const surfMesh = new THREE.Mesh(surfGeo, bridgeMat);
        surfMesh.position.set(b.x, b.y + 1.2, b.z);
        debugGroup.add(surfMesh);

        // rails as tall columns — same XZ footprint as BOX_COLLIDERS in colliders.js
        const rails =
            b.spanAxis === "x"
                ? [
                      { x: b.x, z: b.z - halfWid, hw: halfLen + 1, hl: railThick },
                      { x: b.x, z: b.z + halfWid, hw: halfLen + 1, hl: railThick },
                  ]
                : [
                      { x: b.x - halfWid, z: b.z, hw: railThick, hl: halfLen + 1 },
                      { x: b.x + halfWid, z: b.z, hw: railThick, hl: halfLen + 1 },
                  ];

        for (const r of rails) {
            const geo = new THREE.BoxGeometry(r.hw * 2, RAIL_COL_HEIGHT, r.hl * 2);
            const mesh = new THREE.Mesh(geo, railMat);
            mesh.position.set(r.x, b.y, r.z);
            debugGroup.add(mesh);
        }
    }

    // world boundary — white torus on xz plane
    const worldGeo = new THREE.TorusGeometry(WORLD_RADIUS, 0.5, 4, 64);
    const worldMesh = new THREE.Mesh(worldGeo, mat(0xffffff));
    worldMesh.rotation.x = Math.PI / 2;
    debugGroup.add(worldMesh);

    scene.add(debugGroup);

    document.addEventListener("keydown", (e) => {
        if (e.key === "F3") {
            e.preventDefault();
            active = !active;
            debugGroup.visible = active;
        }
    });
}
