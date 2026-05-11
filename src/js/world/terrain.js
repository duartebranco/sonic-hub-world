import * as THREE from "three";
import { groundY as mapGroundY, baseTerrainY, buildMapObjects } from "./map_design.js";
import { makeGrassMaterial } from "./grass_material.js";

export function groundY(x, z) {
    return mapGroundY(x, z);
}

export function buildTerrain(scene) {
    const geo = new THREE.PlaneGeometry(300, 300, 300, 300);
    geo.rotateX(-Math.PI / 2);

    const pos = geo.attributes.position;
    for (let i = 0; i < pos.count; i++) {
        pos.setY(i, baseTerrainY(pos.getX(i), pos.getZ(i)));
    }
    geo.computeVertexNormals();

    const mesh = new THREE.Mesh(geo, makeGrassMaterial());
    mesh.receiveShadow = true;
    scene.add(mesh);
}

export function buildPath(scene) {
    buildMapObjects(scene);
}
