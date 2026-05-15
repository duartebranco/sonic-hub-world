import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";

import { buildWorld, groundY, resetRings } from "./world/index.js";
import { Player } from "./player/index.js";
import { SpinDash } from "./player/spin.js";
import { ThirdPersonCamera } from "./camera.js";
import { MAX_SPEED } from "./player/physics.js";
import { AudioManager } from "./audio/manager.js";
import { MAP_CONFIG, updateWater } from "./world/map_design.js";

const $ = (id) => document.getElementById(id);

// ─── Title screen / start gate ───────────────────────────
let assetsReady = false;
let userPressedStart = false;
let gameOverShown = false;

function startGame() {
    const ts = $("title-screen");
    ts.classList.add("out");
    setTimeout(() => (ts.style.display = "none"), 750);
}

function showGameOver() {
    if (gameOverShown) return;
    gameOverShown = true;
    document.exitPointerLock?.();
    const go = $("game-over-screen");
    go.style.display = "flex";
    requestAnimationFrame(() => go.classList.add("in"));
}

function onStartInput() {
    audio.unlock();
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
    if (e.key === "Enter") {
        if (gameOverShown) {
            location.reload();
            return;
        }
        onStartInput();
    }
    if ((e.key === "m" || e.key === "M") && !e.repeat) {
        audio.unlock();
        audio.toggleMute();
    }
});

document.addEventListener("click", () => {
    if (gameOverShown) {
        location.reload();
        return;
    }
    renderer.domElement.requestPointerLock?.();
    onStartInput();
});

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
const textureLoader = new THREE.TextureLoader();
textureLoader.load(
    "../textures/sky.png",
    (tex) => {
        tex.mapping = THREE.EquirectangularReflectionMapping;
        tex.colorSpace = THREE.SRGBColorSpace;
        scene.background = tex;
    },
    undefined,
    (err) => {
        console.error("sky texture failed to load:", err);
        scene.background = new THREE.Color(0x79c3e3);
    }
);
scene.fog = new THREE.Fog(0x79c3e3, 55, 200);

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
scene.add(new THREE.AmbientLight(0xb3e5fc, 0.9));
const skyFill = new THREE.DirectionalLight(0x80d8ff, 0.5);
skyFill.position.set(-10, 12, -8);
scene.add(skyFill);

// ─── World ───────────────────────────────────────────────
const {
    flowerSpinners,
    rings,
    goalRing,
    sparkleSystem,
    scatterRingSystem,
    ambientParticles,
    mobs,
} = buildWorld(scene);

// ─── Player + camera controller ──────────────────────────
const spin = new SpinDash(scene, $("spin-charge-bar"), $("spin-charge-fill"));
const player = new Player(scene, spin);
const tpCam = new ThirdPersonCamera(camera, renderer.domElement);
const speedLinesEl = $("speed-lines");
const audio = new AudioManager($("audio-toggle"));
const waterLevel = Math.min(...MAP_CONFIG.waterPlanes.map((w) => w.y));

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
        new Promise((res, rej) =>
            loader.load(
                "../models/sonic_amazed.glb",
                (gltf) => {
                    player.setAmazedModel(gltf.scene);
                    res();
                },
                undefined,
                rej
            )
        ),
        fetch("../animations/idle.json")
            .then((r) => r.json())
            .then((d) => player.setIdleKeyframes(d.keyframes)),
        fetch("../animations/walking.json")
            .then((r) => r.json())
            .then((d) => player.setWalkKeyframes(d.keyframes)),
        fetch("../animations/running.json")
            .then((r) => r.json())
            .then((d) => player.setRunKeyframes(d.keyframes)),
        fetch("../animations/jump.json")
            .then((r) => r.json())
            .then((d) => player.setJumpKeyframes(d.keyframes)),
        fetch("../animations/hit.json")
            .then((r) => r.json())
            .then((d) => player.setHitKeyframes(d.keyframes)),
        fetch("../animations/death.json")
            .then((r) => r.json())
            .then((d) => player.setDeathKeyframes(d.keyframes)),
    ]);

    assetsReady = true;
    if (userPressedStart) startGame();
}

loadAssets().catch((err) => {
    console.error("Asset load error:", err);
    assetsReady = true;
    if (userPressedStart) startGame();
});

// ─── Game state ──────────────────────────────────────────
const RING_TARGET = 50;
let ringCount = 0;
let raceTime = 0;
let timerRunning = false;
let raceActive = false;
let insideGoalRing = false;
let wasInWater = false;
let drownTimer = 0;
let hitCooldown = 0;

function updateRingHUD() {
    $("ring-count").textContent = raceActive ? `${ringCount}/${RING_TARGET}` : `${ringCount}`;
}

function formatTime(t) {
    const mins = Math.floor(t / 60);
    const secs = Math.floor(t % 60);
    const ms = Math.floor((t * 100) % 100);
    return `${mins}:${secs.toString().padStart(2, "0")}.${ms.toString().padStart(2, "0")}`;
}

function startChallenge() {
    resetRings(scene, rings);
    ringCount = 0;
    raceTime = 0;
    raceActive = true;
    timerRunning = true;
    audio.setMusicMode("challenge");
    audio.playChallengeStart();
    $("ring-count").textContent = `0/${RING_TARGET}`;
    $("time-count").textContent = "0:00.00";
    $("time-count").style.color = "";
    $("time-count").style.animation = "";
    $("challenge-hint").classList.remove("hidden");
    $("challenge-complete").classList.add("hidden");
}

function finishChallenge() {
    raceActive = false;
    timerRunning = false;
    audio.setMusicMode("hub");
    audio.playChallengeComplete();

    const timeStr = formatTime(raceTime);
    $("time-count").style.color = "#ffe000";

    const stored = localStorage.getItem("ringChallengeBest");
    const best = stored !== null ? parseFloat(stored) : Infinity;
    const isRecord = raceTime < best;
    if (isRecord) localStorage.setItem("ringChallengeBest", String(raceTime));

    $("cc-time").textContent = timeStr;
    if (isRecord) {
        $("cc-record").classList.remove("hidden");
        $("cc-best").textContent = "";
    } else {
        $("cc-record").classList.add("hidden");
        $("cc-best").textContent = `Best: ${formatTime(best)}`;
    }
    $("challenge-hint").classList.add("hidden");
    $("challenge-complete").classList.remove("hidden");
    setTimeout(() => $("challenge-complete").classList.add("hidden"), 5000);
}

function failChallenge() {
    raceActive = false;
    timerRunning = false;
    insideGoalRing = false;
    ringCount = 0;
    audio.setMusicMode("hub");
    $("challenge-hint").classList.add("hidden");
    $("challenge-complete").classList.add("hidden");
    $("ring-count").textContent = "0";
    $("time-count").textContent = "0:00.00";
    $("time-count").style.color = "";
    $("time-count").style.animation = "";
}

// ─── Game loop ───────────────────────────────────────────
const clock = new THREE.Clock();

function animate() {
    requestAnimationFrame(animate);

    const dt = Math.min(clock.getDelta(), 0.05);
    const now = performance.now() / 1000;

    if (userPressedStart && assetsReady) {
        if (timerRunning) {
            raceTime += dt;
            $("time-count").textContent = formatTime(raceTime);
        }
    }

    player.update(dt, tpCam.yaw, mobs, tpCam.camera);
    tpCam.update(dt, player.pos, player.yaw);

    if (spin.justStartedCharging) {
        audio.startSpinCharge();
    }
    if (spin.charging) {
        audio.updateSpinCharge(spin.charge);
    } else {
        audio.stopSpinCharge();
    }
    if (spin.justReleased) {
        audio.playSpinRelease();
    }

    if (player.justJumped) audio.playJump();
    if (player.justLanded) audio.playLanding();

    const inWater = player.pos.y < waterLevel + 0.15;
    if (inWater !== wasInWater) {
        if (inWater) audio.playWaterEnter();
        else audio.playWaterExit();
        if (!inWater) drownTimer = 0;
        wasInWater = inWater;
    }

    player.underwater = inWater;
    audio.setUnderwater(inWater);
    $("underwater-overlay").classList.toggle("active", inWater);

    if (inWater && !player._inDead) {
        drownTimer += dt;
        const remaining = 60 - drownTimer;
        const drownEl = $("drown-timer");
        if (remaining <= 10) {
            drownEl.textContent = String(Math.ceil(remaining));
            drownEl.classList.add("visible");
        }
        if (drownTimer >= 60) {
            drownTimer = 0;
            drownEl.classList.remove("visible");
            if (ringCount > 0) {
                const scattered = ringCount;
                ringCount = 0;
                updateRingHUD();
                audio.playRingScatter();
                scatterRingSystem.spawn(player.pos.clone(), scattered);
            } else {
                player._inDead = true;
            }
            if (raceActive) failChallenge();
        }
    } else {
        drownTimer = 0;
        $("drown-timer").classList.remove("visible");
    }

    if (hitCooldown > 0) hitCooldown -= dt;

    if (player.speed >= MAX_SPEED * 0.88 && !player.inAir) {
        speedLinesEl.classList.add("active");
    } else {
        speedLinesEl.classList.remove("active");
    }

    sun.position.set(player.pos.x + 20, 35, player.pos.z + 15);
    sun.target.position.set(player.pos.x, player.pos.y, player.pos.z);

    updateWater(now);

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
        if (dx * dx + dy * dy + dz * dz < 2.5) {
            r.collected = true;
            sparkleSystem.spawn(r.mesh.position.clone());
            scene.remove(r.mesh);
            audio.playRing();
            ringCount++;
            updateRingHUD();
            if (raceActive && ringCount >= RING_TARGET) finishChallenge();
        }
    });

    goalRing.rotation.y += dt * 1.5;
    const gdx = player.pos.x - goalRing.position.x;
    const gdy = player.pos.y + 0.5 - goalRing.position.y;
    const gdz = player.pos.z - goalRing.position.z;
    const nowInsideGoalRing = gdx * gdx + gdy * gdy + gdz * gdz < 25.0;
    if (nowInsideGoalRing && !insideGoalRing) startChallenge();
    insideGoalRing = nowInsideGoalRing;

    sparkleSystem.update(dt);
    const scatterCollected = scatterRingSystem.update(dt, player._inDead ? null : player.pos);
    if (scatterCollected > 0) {
        sparkleSystem.spawn(player.pos.clone());
        audio.playRing();
        ringCount += scatterCollected;
        updateRingHUD();
        if (raceActive && ringCount >= RING_TARGET) finishChallenge();
    }

    flowerSpinners.forEach((f) => {
        f.head.rotation.y += dt * 1.2;
    });

    mobs.forEach((m) => {
        if (m.dead) return;
        m.update(dt, player.pos);

        const dx = player.pos.x - m.mesh.position.x;
        const dz = player.pos.z - m.mesh.position.z;
        const dy = player.pos.y - m.mesh.position.y;
        const distSq = dx * dx + dz * dz + dy * dy;
        if (distSq > 1.6) return;

        if (player.inSpin) {
            m.dead = true;
            scene.remove(m.mesh);
            audio.playMobDestroy();
            return;
        }

        if (hitCooldown > 0 || player._inDead) return;

        hitCooldown = 1.1;
        player._inHit = true;
        player._hitT = 0;
        audio.playPlayerHit();

        const awayLen = Math.max(0.001, Math.sqrt(dx * dx + dz * dz));
        player._vel.x = (dx / awayLen) * 20;
        player._vel.z = (dz / awayLen) * 20;
        player._jumpVel = 4;
        player._inAir = true;
        player._groundY = player.pos.y;

        if (ringCount > 0) {
            const scattered = ringCount;
            ringCount = 0;
            updateRingHUD();
            audio.playRingScatter();
            scatterRingSystem.spawn(player.pos.clone(), scattered);
        } else {
            player._inDead = true;
        }

        if (raceActive) failChallenge();
    });

    if (player._deadAnimDone) showGameOver();

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
