import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";

import { buildWorld, groundY } from "./world/index.js";
import { Player } from "./player/index.js";
import { SpinDash } from "./player/spin.js";
import { ThirdPersonCamera } from "./camera.js";
import { MAX_SPEED } from "./player/physics.js";
import { AudioManager } from "./audio.js";

const $ = (id) => document.getElementById(id);

// ─── Title screen ────────────────────────────────────────
let assetsReady = false;
let userPressedStart = false;

function startGame() {
    const ts = $("title-screen");
    ts.classList.add("out");
    setTimeout(() => (ts.style.display = "none"), 750);
}

const audio = new AudioManager();

function onStartInput() {
    if (userPressedStart) return;
    userPressedStart = true;
    audio.init();
    audio.startExploreMusic();
    if (assetsReady) {
        startGame();
    } else {
        $("ts-press").textContent = "Loading…";
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
const { flowerSpinners, cloudDrifters, rings, goalRing, sparkleSystem, ambientParticles, mobs, checkpoints } =
    buildWorld(scene);

// ─── Player + camera controller ──────────────────────────
const spin = new SpinDash(scene, $("spin-charge-bar"), $("spin-charge-fill"));
const player = new Player(scene, spin);
const tpCam = new ThirdPersonCamera(camera, renderer.domElement);
const speedLinesEl = $("speed-lines");

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
        loader.load("../models/sonic.glb", (gltf) => { player.setModel(gltf.scene); res(); }, undefined, rej);
    });
    await Promise.all([
        fetch("../animations/idle.json").then((r) => r.json()).then((d) => player.setIdleKeyframes(d.keyframes)),
        fetch("../animations/walking.json").then((r) => r.json()).then((d) => player.setWalkKeyframes(d.keyframes)),
        fetch("../animations/running.json").then((r) => r.json()).then((d) => player.setRunKeyframes(d.keyframes)),
        fetch("../animations/jump.json").then((r) => r.json()).then((d) => player.setJumpKeyframes(d.keyframes)),
    ]);
    assetsReady = true;
    if (userPressedStart) startGame();
}
loadAssets().catch((err) => {
    console.error("Asset load error:", err);
    assetsReady = true;
    if (userPressedStart) startGame();
});

// ─── Race state ──────────────────────────────────────────
// idle: player explores freely; racing: timer + checkpoints; finished: time locked
let raceState = "idle"; // 'idle' | 'racing' | 'finished'
let raceTime = 0;
let raceStartCooldown = 0;
let ringCount = 0;
let wasInAir = false;

let flashTimeout = null;
function showFlash(text) {
    const el = $("race-flash");
    el.textContent = text;
    el.classList.remove("hidden");
    el.style.animation = "none";
    void el.offsetWidth; // trigger reflow to restart animation
    el.style.animation = "";
    if (flashTimeout) clearTimeout(flashTimeout);
    flashTimeout = setTimeout(() => el.classList.add("hidden"), 1800);
}

function formatTime(t) {
    const mins = Math.floor(t / 60);
    const secs = Math.floor(t % 60);
    const ms = Math.floor((t * 100) % 100);
    return `${mins}:${secs.toString().padStart(2, "0")}.${ms.toString().padStart(2, "0")}`;
}

function updateCpHud() {
    $("cp-count").textContent = `${checkpoints.getNext()}/${checkpoints.total}`;
}

// ─── Game loop ───────────────────────────────────────────
const clock = new THREE.Clock();

function animate() {
    requestAnimationFrame(animate);
    const dt = Math.min(clock.getDelta(), 0.05);
    const now = performance.now() / 1000;

    if (userPressedStart && assetsReady) {
        // goal ring proximity (XZ plane only)
        const gdx = player.pos.x - goalRing.position.x;
        const gdz = player.pos.z - goalRing.position.z;
        const goalDist2 = gdx * gdx + gdz * gdz;

        goalRing.rotation.y += dt * 1.5;

        if (raceState === "idle") {
            if (goalDist2 < 64) {
                raceState = "racing";
                raceTime = 0;
                raceStartCooldown = 3.0;
                checkpoints.startRace();
                updateCpHud();
                $("time-count").style.color = "#ffffff";
                $("time-count").style.animation = "none";
                showFlash("RACE START!");
                audio.startRaceMusic();
            }
        } else if (raceState === "racing") {
            raceTime += dt;
            $("time-count").textContent = formatTime(raceTime);

            if (raceStartCooldown > 0) raceStartCooldown -= dt;

            if (checkpoints.update(player.pos)) {
                updateCpHud();
                audio.playCheckpoint();
            }

            if (goalDist2 < 64 && raceStartCooldown <= 0 && checkpoints.allPassed()) {
                raceState = "finished";
                $("time-count").style.color = "#ffe000";
                $("time-count").style.animation = "ts-blink 0.5s step-end infinite";
                showFlash("FINISH!");
                audio.playFinish();
                audio.startExploreMusic();
            }
        }
    }

    player.update(dt, tpCam.yaw);
    if (player.inAir && !wasInAir) audio.playJump();
    wasInAir = player.inAir;
    tpCam.update(dt, player.pos);

    if (player.speed >= MAX_SPEED * 0.88 && !player.inAir) {
        speedLinesEl.classList.add("active");
    } else {
        speedLinesEl.classList.remove("active");
    }

    sun.position.set(player.pos.x + 20, 35, player.pos.z + 15);
    sun.target.position.set(player.pos.x, player.pos.y, player.pos.z);

    rings.forEach((r) => {
        if (r.collected) return;
        r.mesh.rotation.z += dt * 2.8;
        r.mesh.position.y = groundY(r.mesh.position.x, r.mesh.position.z) + 1.0 + Math.sin(now * 2.5 + r.phase) * 0.13;
        const dx = player.pos.x - r.mesh.position.x;
        const dy = player.pos.y + 0.5 - r.mesh.position.y;
        const dz = player.pos.z - r.mesh.position.z;
        if (dx * dx + dy * dy + dz * dz < 0.9) {
            r.collected = true;
            sparkleSystem.spawn(r.mesh.position.clone());
            scene.remove(r.mesh);
            ringCount++;
            $("ring-count").textContent = String(ringCount);
            audio.playRing();
        }
    });

    sparkleSystem.update(dt);

    cloudDrifters.forEach((c) => {
        c.mesh.position.x += c.speed * dt * 0.3;
        if (c.mesh.position.x > 110) c.mesh.position.x = -110;
    });

    flowerSpinners.forEach((f) => { f.head.rotation.y += dt * 1.2; });
    mobs.forEach((m) => m.update(dt));

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
