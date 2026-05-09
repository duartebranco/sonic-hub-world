import * as THREE from "three";
import { groundY as mapGroundY, buildMapObjects, MAP_CONFIG } from "./map_design.js";

// Re-export groundY so that physics and other modules continue to work
export function groundY(x, z) {
    return mapGroundY(x, z);
}

export function buildTerrain(scene) {
    // 300x300 world with high subdivision to clearly render steep walls
    const geo = new THREE.PlaneGeometry(300, 300, 300, 300);
    geo.rotateX(-Math.PI / 2);

    const pos = geo.attributes.position;
    // 0 = grass_light, 1 = grass_shadow, 2 = cliff
    const selectors = new Float32Array(pos.count);

    for (let i = 0; i < pos.count; i++) {
        const x = pos.getX(i);
        const z = pos.getZ(i);
        const y = groundY(x, z);
        pos.setY(i, y);

        const dx = groundY(x + 0.5, z) - y;
        const dz = groundY(x, z + 0.5) - y;
        const slope = Math.sqrt(dx * dx + dz * dz) / 0.5;

        let wallCovered = false;
        if (slope > 0.8) {
            const d = Math.sqrt(x * x + z * z);
            if (d > MAP_CONFIG.worldRadius - 1.0) wallCovered = true;
        }

        if (slope > 0.8 && !wallCovered) {
            selectors[i] = 2;
        } else {
            const cx = Math.floor(x / 4);
            const cz = Math.floor(z / 4);
            selectors[i] = (cx + cz) % 2 === 0 ? 0 : 1;
        }
    }

    geo.setAttribute("selector", new THREE.BufferAttribute(selectors, 1));
    geo.computeVertexNormals();

    const loader = new THREE.TextureLoader();
    const grassLightTex = loader.load("../textures/grass_light.png");
    const grassShadowTex = loader.load("../textures/grass_shadow.png");
    const walTex = loader.load("../textures/wal.png");
    for (const tex of [grassLightTex, grassShadowTex, walTex]) {
        tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
    }

    const mat = new THREE.MeshStandardMaterial({
        roughness: 0.85,
        metalness: 0.0,
    });

    mat.onBeforeCompile = (shader) => {
        shader.uniforms.grassLight = { value: grassLightTex };
        shader.uniforms.grassShadow = { value: grassShadowTex };
        shader.uniforms.walTex = { value: walTex };

        shader.vertexShader = shader.vertexShader.replace(
            "void main() {",
            `attribute float selector;
            varying float vSelector;
            varying vec2 vGrassUv;
            void main() {
                vSelector = selector;
                vGrassUv = position.xz / 10.0;`
        );

        shader.fragmentShader = shader.fragmentShader.replace(
            "uniform vec3 diffuse;",
            `uniform vec3 diffuse;
            uniform sampler2D grassLight;
            uniform sampler2D grassShadow;
            uniform sampler2D walTex;
            varying float vSelector;
            varying vec2 vGrassUv;`
        );

        shader.fragmentShader = shader.fragmentShader.replace(
            "#include <color_fragment>",
            `#include <color_fragment>
            float sel = floor(vSelector + 0.5);
            if (sel < 0.5) {
                diffuseColor.rgb = texture2D(grassLight, vGrassUv).rgb;
            } else if (sel < 1.5) {
                diffuseColor.rgb = texture2D(grassShadow, vGrassUv).rgb;
            } else {
                diffuseColor.rgb = texture2D(walTex, vGrassUv).rgb;
            }`
        );
    };

    const mesh = new THREE.Mesh(geo, mat);
    mesh.receiveShadow = true;
    scene.add(mesh);
}

export function buildPath(scene) {
    buildMapObjects(scene);
}
