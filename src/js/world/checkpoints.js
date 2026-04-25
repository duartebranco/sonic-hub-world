import * as THREE from "three";
import { groundY } from "./map_design.js";

const DEFS = [
    { x: 5,   z: -50, ry: 0 },              // 1: north sprint / ramp exit
    { x: 72,  z: -20, ry: 0 },              // 2: east straight mid
    { x: 55,  z: 65,  ry: Math.PI / 2 },   // 3: SE mound
    { x: -72, z: 0,   ry: 0 },              // 4: west section
    { x: -52, z: -54, ry: Math.PI / 4 },   // 5: NW return
];

const COL = { inactive: 0x888888, next: 0xffcc00, passed: 0x44ee44 };

function gate(scene, def) {
    const y0 = groundY(def.x, def.z);
    const mat = new THREE.MeshStandardMaterial({
        color: COL.inactive,
        emissive: COL.inactive,
        emissiveIntensity: 0.35,
        roughness: 0.4,
    });

    const pillarGeo = new THREE.CylinderGeometry(0.3, 0.35, 5, 12);
    const barGeo = new THREE.CylinderGeometry(0.18, 0.18, 9.5, 10);
    barGeo.rotateZ(Math.PI / 2);
    const tipGeo = new THREE.SphereGeometry(0.36, 12, 12);

    const mk = (g, x, y, z) => {
        const m = new THREE.Mesh(g, mat);
        m.position.set(x, y, z);
        m.castShadow = true;
        return m;
    };

    const group = new THREE.Group();
    group.add(
        mk(pillarGeo, -4, 2.5, 0),
        mk(pillarGeo,  4, 2.5, 0),
        mk(barGeo,     0, 5.1, 0),
        mk(tipGeo,    -4, 5.45, 0),
        mk(tipGeo,     4, 5.45, 0),
    );
    group.position.set(def.x, y0, def.z);
    group.rotation.y = def.ry;
    scene.add(group);
    return { group, mat };
}

function setColor(mat, hex) {
    mat.color.setHex(hex);
    mat.emissive.setHex(hex);
}

export function buildCheckpoints(scene) {
    const gates = DEFS.map((def) => {
        const { group, mat } = gate(scene, def);
        return { ...def, group, mat, passed: false };
    });

    let nextIdx = 0;

    function startRace() {
        nextIdx = 0;
        gates.forEach((g, i) => {
            g.passed = false;
            setColor(g.mat, i === 0 ? COL.next : COL.inactive);
        });
    }

    function update(playerPos) {
        if (nextIdx >= gates.length) return false;
        const g = gates[nextIdx];
        const dx = playerPos.x - g.x;
        const dz = playerPos.z - g.z;
        if (dx * dx + dz * dz < 64) {
            g.passed = true;
            setColor(g.mat, COL.passed);
            nextIdx++;
            if (nextIdx < gates.length) setColor(gates[nextIdx].mat, COL.next);
            return true;
        }
        return false;
    }

    return {
        total: DEFS.length,
        startRace,
        update,
        allPassed: () => nextIdx >= gates.length,
        getNext: () => nextIdx,
    };
}
