import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";

import { buildWorld, groundY } from "./world/index.js";
import { Player } from "./player.js";
import { ThirdPersonCamera } from "./camera.js";

const $ = (id) => document.getElementById(id);

// ─── Title screen / start gate ───────────────────────────
let assetsReady = false;
let userPressedStart = false;

function startGame() {
    const ts = $("title-screen");
    ts.classList.add("out");
    setTimeout(() => (ts.style.display = "none"), 750);
}

function onStartInput() {
    if (userPressedStart) return;
    userPressedStart = true;
    if (assetsReady) {
        startGame();
    } else {
        $("ts-press").textContent = "Loading\u2026";
        $("ts-press").style.animation = "none";
        $("ts-press").style.opacity = "1";
    }
}

document.addEventListener("keydown", (e) => {
    if (e.key === "Enter" || e.key === " ") onStartInput();
});
document.addEventListener("click", onStartInput);

// ─── Renderer ────────────────────────────────────────────
const container = $("canvas-container");
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.05;
container.appendChild(renderer.domElement);

// ─── Scene ───────────────────────────────────────────────
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x4fc3f7);
scene.fog = new THREE.FogExp2(0x87ceeb, 0.018);

// ─── Camera ──────────────────────────────────────────────
const camera = new THREE.PerspectiveCamera(58, 1, 0.05, 400);
camera.position.set(0, 6, 12);

// ─── Lights ──────────────────────────────────────────────
const sun = new THREE.DirectionalLight(0xfff9e6, 3.0);
sun.position.set(20, 35, 15);
sun.castShadow = true;
sun.shadow.mapSize.set(2048, 2048);
sun.shadow.camera.near = 0.5;
sun.shadow.camera.far = 140;
sun.shadow.camera.left = -50;
sun.shadow.camera.right = 50;
sun.shadow.camera.top = 50;
sun.shadow.camera.bottom = -50;
sun.shadow.bias = -0.0003;
scene.add(sun, sun.target);
scene.add(new THREE.AmbientLight(0xb3e5fc, 1.1));
const skyFill = new THREE.DirectionalLight(0x80d8ff, 0.5);
skyFill.position.set(-10, 12, -8);
scene.add(skyFill);

// ─── World ───────────────────────────────────────────────
const { flowerSpinners, cloudDrifters, rings, sparkleSystem, ambientParticles } = buildWorld(scene);

// ─── Player + camera controller ──────────────────────────
const player = new Player(scene);
const tpCam = new ThirdPersonCamera(camera, renderer.domElement);

// ─── Resize ──────────────────────────────────────────────
function onResize() {
    const w = container.clientWidth;
    const h = container.clientHeight;
    renderer.setSize(w, h);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
}
window.addEventListener("resize", onResize);
onResize();

// ─── Asset loading ───────────────────────────────────────
async function loadAssets() {
    const loader = new GLTFLoader();

    await new Promise((res, rej) => {
        loader.load(
            "../models/sonic.glb",
            (gltf) => {
                player.setModel(gltf.scene);
                res();
            },
            undefined,
            rej
        );
    });

    await Promise.all([
        fetch("../animations/idle.json")
            .then((r) => r.json())
            .then((d) => player.setIdleKeyframes(d.keyframes)),
        fetch("../animations/walking.json")
            .then((r) => r.json())
            .then((d) => player.setWalkKeyframes(d.keyframes)),
        fetch("../animations/running.json")
            .then((r) => r.json())
            .then((d) => player.setRunKeyframes(d.keyframes)),
    ]);

    assetsReady = true;
    if (userPressedStart) startGame();
}

loadAssets().catch((err) => {
    console.error("Asset load error:", err);
    assetsReady = true;
    if (userPressedStart) startGame();
});

// ─── Ring state ──────────────────────────────────────────
let ringCount = 0;

// ─── Spin charge HUD ─────────────────────────────────────
const spinBar = $("spin-charge-bar");
const spinFill = $("spin-charge-fill");

// ─── Spin charge particles ────────────────────────────────
const SPIN_P = 48;
const spinPPos = new Float32Array(SPIN_P * 3);
const spinPGeo = new THREE.BufferGeometry();
spinPGeo.setAttribute("position", new THREE.BufferAttribute(spinPPos, 3));
const spinPMat = new THREE.PointsMaterial({
    size: 0.15,
    transparent: true,
    opacity: 0,
    depthWrite: false,
    vertexColors: false,
});
const spinPts = new THREE.Points(spinPGeo, spinPMat);
scene.add(spinPts);
// per-particle data
const spinPAngles = new Float32Array(SPIN_P).map((_, i) => (i / SPIN_P) * Math.PI * 2);
const spinPYOff = new Float32Array(SPIN_P).map(() => Math.random() * 0.9);
const spinPSpeeds = new Float32Array(SPIN_P).map(() => 3 + Math.random() * 3);

// ─── Game loop ───────────────────────────────────────────
const clock = new THREE.Clock();

function animate() {
    requestAnimationFrame(animate);

    const dt = Math.min(clock.getDelta(), 0.05);
    const now = performance.now() / 1000;

    player.update(dt, tpCam.yaw);
    tpCam.update(dt, player.pos);

    if (player.spinCharging) {
        const charge = player.spinCharge;

        // hud charge bar
        spinBar.classList.remove("hidden");
        spinFill.style.width = `${charge * 100}%`;
        spinFill.classList.toggle("full", charge >= 1);

        // orbit particles: radius and orbit speed grow with charge
        const radius = 0.5 + charge * 1.4;
        const orbitSpeed = 4 + charge * 10;
        // color shifts from blue (h=0.6) to orange-red (h=0.08)
        spinPMat.color.setHSL(0.6 - charge * 0.52, 1.0, 0.55);
        spinPMat.opacity = 0.35 + charge * 0.65;
        spinPMat.size = 0.1 + charge * 0.22;
        const attr = spinPGeo.attributes.position;
        for (let i = 0; i < SPIN_P; i++) {
            spinPAngles[i] += dt * (spinPSpeeds[i] + orbitSpeed);
            attr.setXYZ(
                i,
                player.pos.x + Math.cos(spinPAngles[i]) * radius,
                player.pos.y + spinPYOff[i] * (0.2 + charge * 0.8),
                player.pos.z + Math.sin(spinPAngles[i]) * radius
            );
        }
        attr.needsUpdate = true;
    } else {
        spinBar.classList.add("hidden");
        spinPMat.opacity = 0;
    }

    sun.position.set(player.pos.x + 20, 35, player.pos.z + 15);
    sun.target.position.set(player.pos.x, player.pos.y, player.pos.z);

    rings.forEach((r) => {
        if (r.collected) return;

        r.mesh.rotation.z += dt * 2.8;
        r.mesh.position.y =
            groundY(r.mesh.position.x, r.mesh.position.z) +
            1.0 +
            Math.sin(now * 2.5 + r.phase) * 0.13;

        const dx = player.pos.x - r.mesh.position.x;
        const dy = player.pos.y + 0.5 - r.mesh.position.y;
        const dz = player.pos.z - r.mesh.position.z;
        if (dx * dx + dy * dy + dz * dz < 0.9) {
            r.collected = true;
            sparkleSystem.spawn(r.mesh.position.clone());
            scene.remove(r.mesh);
            ringCount++;
            $("ring-count").textContent = String(ringCount);
        }
    });

    sparkleSystem.update(dt);

    cloudDrifters.forEach((c) => {
        c.mesh.position.x += c.speed * dt * 0.3;
        if (c.mesh.position.x > 110) c.mesh.position.x = -110;
    });

    flowerSpinners.forEach((f) => {
        f.head.rotation.y += dt * 1.2;
    });

    const ap = ambientParticles.geo.attributes.position;
    for (let i = 0; i < ap.count; i++) {
        let y = ap.getY(i) + dt * 0.35;
        if (y > 14) y = 0.3;
        ap.setY(i, y);
    }
    ap.needsUpdate = true;
    ambientParticles.pts.material.opacity = 0.38 + Math.sin(now * 1.8) * 0.18;

    renderer.render(scene, camera);
}

animate();
