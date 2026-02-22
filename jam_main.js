/**
 * jam_main.js
 * Entry point for the Saturn-style Sonic Jam world.
 * Wires the low-res renderer, post-processing shader, scene, and all modules.
 */

import * as THREE from 'three';

import { renderer, renderTarget,
         postScene, postCamera,
         initRendererDOM }                 from './js/jam/renderer.js';
import { buildSky }                        from './js/jam/sky.js';
import { buildLighting }                   from './js/jam/lighting.js';
import { buildWorld }                      from './js/jam/world.js';
import { loadPlayer, updatePlayer,
         sonicGroup, sonicFacing }         from './js/jam/player.js';
import { camera, setupCameraInput,
         updateCamera, onResize, camYaw }  from './js/jam/camera.js';
import { updateHUD }                       from './js/jam/hud.js';
import { keys }                            from './js/jam/input.js';

// ════════════════════════════════════════════════════════════════
//  RENDERER SETUP
// ════════════════════════════════════════════════════════════════

initRendererDOM();

// ════════════════════════════════════════════════════════════════
//  SCENE + MODULES
// ════════════════════════════════════════════════════════════════

const scene = new THREE.Scene();

buildSky(scene);
buildLighting(scene);
buildWorld(scene);
loadPlayer(scene);
setupCameraInput(renderer.domElement);

// ════════════════════════════════════════════════════════════════
//  MAIN LOOP
// ════════════════════════════════════════════════════════════════

const clock = new THREE.Clock();

function animate() {
    requestAnimationFrame(animate);

    const dt     = Math.min(clock.getDelta(), 0.05);
    const moving = updatePlayer(dt, keys, camYaw);
    updateCamera(dt, sonicGroup, sonicFacing, moving);
    updateHUD(sonicGroup);

    // Render scene into low-res target, then blit through posterise shader
    renderer.setRenderTarget(renderTarget);
    renderer.render(scene, camera);
    renderer.setRenderTarget(null);
    renderer.render(postScene, postCamera);
}

animate();

// ════════════════════════════════════════════════════════════════
//  RESIZE
// ════════════════════════════════════════════════════════════════

window.addEventListener('resize', () => {
    onResize();
    // Don't resize the renderer — keep it at Saturn native resolution.
    // CSS scales it up pixel-perfectly.
});