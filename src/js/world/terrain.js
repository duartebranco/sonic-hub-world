import * as THREE from "three";
import { groundY as mapGroundY, baseTerrainY, buildMapObjects } from "./map_design.js";

export function groundY(x, z) {
    return mapGroundY(x, z);
}

export function buildTerrain(scene) {
    const geo = new THREE.PlaneGeometry(300, 300, 300, 300);
    geo.rotateX(-Math.PI / 2);

    const pos = geo.attributes.position;
    const tints = new Float32Array(pos.count * 3);

    for (let i = 0; i < pos.count; i++) {
        const x = pos.getX(i);
        const z = pos.getZ(i);
        pos.setY(i, baseTerrainY(x, z));

        const t = (Math.sin(x * 0.31 + 1.7) * Math.cos(z * 0.29 + 0.8) + 1.0) * 0.5;
        tints[i * 3 + 0] = 0.88 + t * 0.12;
        tints[i * 3 + 1] = 0.92 + t * 0.08;
        tints[i * 3 + 2] = 0.84 + t * 0.14;
    }

    geo.setAttribute("tint", new THREE.BufferAttribute(tints, 3));
    geo.computeVertexNormals();

    const loader = new THREE.TextureLoader();
    const grassLightTex = loader.load("../textures/grass_light.png");
    const grassShadowTex = loader.load("../textures/grass_shadow.png");
    for (const tex of [grassLightTex, grassShadowTex]) {
        tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
    }

    const mat = new THREE.MeshStandardMaterial({ roughness: 0.85, metalness: 0.0 });

    mat.onBeforeCompile = (shader) => {
        shader.uniforms.grassLight = { value: grassLightTex };
        shader.uniforms.grassShadow = { value: grassShadowTex };

        shader.vertexShader = shader.vertexShader.replace(
            "void main() {",
            `attribute vec3 tint;
            varying vec3 vTint;
            varying vec2 vDetailUv;
            varying vec2 vMacroUv;
            varying vec2 vNoiseUv;
            void main() {
                vTint = tint;
                vDetailUv = position.xz / 18.0;
                vMacroUv = position.xz / 90.0;
                vNoiseUv = position.xz * 0.07;`
        );

        shader.fragmentShader = shader.fragmentShader.replace(
            "uniform vec3 diffuse;",
            `uniform vec3 diffuse;
            uniform sampler2D grassLight;
            uniform sampler2D grassShadow;
            varying vec3 vTint;
            varying vec2 vDetailUv;
            varying vec2 vMacroUv;
            varying vec2 vNoiseUv;

            float hash(vec2 p) {
                p = fract(p * vec2(234.34, 435.345));
                p += dot(p, p + 34.23);
                return fract(p.x * p.y);
            }

            float noise(vec2 p) {
                vec2 i = floor(p);
                vec2 f = fract(p);
                f = f * f * (3.0 - 2.0 * f);
                return mix(
                    mix(hash(i), hash(i + vec2(1.0, 0.0)), f.x),
                    mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), f.x),
                    f.y
                );
            }`
        );

        shader.fragmentShader = shader.fragmentShader.replace(
            "#include <color_fragment>",
            `#include <color_fragment>
            vec3 gLight = texture2D(grassLight, vDetailUv).rgb;
            vec3 gShadow = texture2D(grassShadow, vDetailUv).rgb;
            float n = noise(vNoiseUv);
            vec3 grass = mix(gLight, gShadow, smoothstep(0.35, 0.65, n));
            grass *= vTint;
            vec3 macro = texture2D(grassLight, vMacroUv).rgb;
            grass = mix(grass, grass * macro * 1.4, 0.18);
            float luma = dot(grass, vec3(0.299, 0.587, 0.114));
            grass = mix(vec3(luma), grass, 1.8) * vec3(0.82, 1.08, 0.72);
            diffuseColor.rgb = grass;`
        );
    };

    const mesh = new THREE.Mesh(geo, mat);
    mesh.receiveShadow = true;
    scene.add(mesh);
}

export function buildPath(scene) {
    buildMapObjects(scene);
}
