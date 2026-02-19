/**
 * input.js
 * Simple keyboard state map.
 * Import `keys` and check keys['KeyW'] etc.
 */

export const keys = {};

window.addEventListener('keydown', e => { keys[e.code] = true;  });
window.addEventListener('keyup',   e => { keys[e.code] = false; });
