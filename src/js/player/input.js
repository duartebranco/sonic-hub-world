import * as THREE from "three";

export function bindInput(player) {
    window.addEventListener("keydown", (e) => {
        player._keys[e.code] = true;
        if (e.code === "Space" && !e.repeat) player._jumpQueued = true;
    });
    window.addEventListener("keyup", (e) => {
        player._keys[e.code] = false;
    });
}

export function getPlayerInput(player, camYaw) {
    const k = player._keys;
    const fwd = k["KeyW"] || k["ArrowUp"];
    const back = k["KeyS"] || k["ArrowDown"];
    const left = k["KeyA"] || k["ArrowLeft"];
    const right = k["KeyD"] || k["ArrowRight"];
    const spinKey = k["ShiftLeft"] || k["KeyX"];

    const mx = (right ? 1 : 0) - (left ? 1 : 0);
    const mz = (fwd ? 1 : 0) - (back ? 1 : 0);
    const hasInput = mx !== 0 || mz !== 0;

    // Camera-relative flat input direction
    const cf = new THREE.Vector3(-Math.sin(camYaw), 0, -Math.cos(camYaw));
    const cr = new THREE.Vector3(Math.cos(camYaw), 0, -Math.sin(camYaw));

    const inputDir = new THREE.Vector3();
    if (hasInput) {
        inputDir.addScaledVector(cf, mz).addScaledVector(cr, mx).normalize();
    }

    return {
        hasInput,
        inputDir,
        spinKey,
    };
}
