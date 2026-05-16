const RADIUS = 52; // joystick knob travel in CSS pixels

export function bindTouchInput(player) {
    player._touch = { mx: 0, mz: 0, spinHeld: false, jumpHeld: false };

    const zone = document.getElementById("joy-zone");
    const knob = document.getElementById("joy-knob");
    let joyId = null;
    let origin = { x: 0, y: 0 };

    function moveKnob(cx, cy) {
        const dx = cx - origin.x;
        const dy = cy - origin.y;
        const len = Math.hypot(dx, dy);
        const s = Math.min(len, RADIUS) / (len || 1);
        const nx = dx * s;
        const ny = dy * s;
        player._touch.mx = nx / RADIUS;
        player._touch.mz = -ny / RADIUS; // screen-up = game-forward
        knob.style.transform = `translate(calc(-50% + ${nx}px), calc(-50% + ${ny}px))`;
    }

    function resetJoystick() {
        joyId = null;
        player._touch.mx = 0;
        player._touch.mz = 0;
        knob.style.transform = "translate(-50%, -50%)";
    }

    zone.addEventListener(
        "touchstart",
        (e) => {
            if (joyId !== null) return;
            e.preventDefault();
            const t = e.changedTouches[0];
            joyId = t.identifier;
            const r = zone.getBoundingClientRect();
            origin = { x: r.left + r.width / 2, y: r.top + r.height / 2 };
            moveKnob(t.clientX, t.clientY);
        },
        { passive: false }
    );

    window.addEventListener(
        "touchmove",
        (e) => {
            for (const t of e.changedTouches) {
                if (t.identifier === joyId) {
                    e.preventDefault();
                    moveKnob(t.clientX, t.clientY);
                    return;
                }
            }
        },
        { passive: false }
    );

    window.addEventListener("touchend", (e) => {
        for (const t of e.changedTouches) {
            if (t.identifier === joyId) {
                resetJoystick();
            }
        }
    });

    window.addEventListener("touchcancel", (e) => {
        for (const t of e.changedTouches) {
            if (t.identifier === joyId) {
                resetJoystick();
            }
        }
    });

    const jumpBtn = document.getElementById("btn-jump");
    jumpBtn.addEventListener(
        "touchstart",
        (e) => {
            e.preventDefault();
            player._jumpQueued = true;
            player._touch.jumpHeld = true;
        },
        { passive: false }
    );
    jumpBtn.addEventListener("touchend", () => {
        player._touch.jumpHeld = false;
    });
    jumpBtn.addEventListener("touchcancel", () => {
        player._touch.jumpHeld = false;
    });

    const spinBtn = document.getElementById("btn-spin");
    spinBtn.addEventListener(
        "touchstart",
        (e) => {
            e.preventDefault();
            player._touch.spinHeld = true;
        },
        { passive: false }
    );
    spinBtn.addEventListener("touchend", () => {
        player._touch.spinHeld = false;
    });
    spinBtn.addEventListener("touchcancel", () => {
        player._touch.spinHeld = false;
    });
}
