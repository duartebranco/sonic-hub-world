import * as THREE from "three";

const loader = new THREE.TextureLoader();

function loadGrassTextures() {
    const light = loader.load("../textures/grass_light.png");
    const shadow = loader.load("../textures/grass_shadow.png");
    light.wrapS = light.wrapT = THREE.RepeatWrapping;
    shadow.wrapS = shadow.wrapT = THREE.RepeatWrapping;
    return { light, shadow };
}

// returns a MeshStandardMaterial whose shader samples grass_light / grass_shadow
// using world-space XZ for UVs and tint, so terrain and plateau caps align seamlessly
export function makeGrassMaterial() {
    const { light: grassLightTex, shadow: grassShadowTex } = loadGrassTextures();

    const mat = new THREE.MeshStandardMaterial({ roughness: 0.85, metalness: 0.0 });

    mat.onBeforeCompile = (shader) => {
        shader.uniforms.grassLight = { value: grassLightTex };
        shader.uniforms.grassShadow = { value: grassShadowTex };

        shader.vertexShader = shader.vertexShader.replace(
            "void main() {",
            `varying vec2 vDetailUv;
            varying vec2 vMacroUv;
            varying vec2 vNoiseUv;
            varying vec3 vTint;
            void main() {
                vec4 wp = modelMatrix * vec4(position, 1.0);
                vDetailUv = wp.xz / 18.0;
                vMacroUv  = wp.xz / 90.0;
                vNoiseUv  = wp.xz * 0.07;
                float t = (sin(wp.x * 0.31 + 1.7) * cos(wp.z * 0.29 + 0.8) + 1.0) * 0.5;
                vTint = vec3(0.88 + t * 0.12, 0.92 + t * 0.08, 0.84 + t * 0.14);`
        );

        shader.fragmentShader = shader.fragmentShader.replace(
            "uniform vec3 diffuse;",
            `uniform vec3 diffuse;
            uniform sampler2D grassLight;
            uniform sampler2D grassShadow;
            varying vec2 vDetailUv;
            varying vec2 vMacroUv;
            varying vec2 vNoiseUv;
            varying vec3 vTint;

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

    return mat;
}
