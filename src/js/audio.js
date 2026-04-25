// music paths relative to index.html
const MUSIC = {
    explore: "../audio/music/Emerald Lobby Loop.mp3",
    race: "../audio/music/Emerald Breeze Zone.mp3",
};

export class AudioManager {
    constructor() {
        this._ctx = null;
        this._music = null;
        this._musicTrack = null; // which key is playing
        this._musicGain = null;
    }

    // must be called from a user gesture to unlock the audio context
    init() {
        if (this._ctx) return;
        this._ctx = new AudioContext();
        this._musicGain = this._ctx.createGain();
        this._musicGain.gain.value = 0.55;
        this._musicGain.connect(this._ctx.destination);
    }

    _playMusic(track) {
        if (!this._ctx || this._musicTrack === track) return;
        this._stopMusic();
        this._musicTrack = track;
        const el = new Audio(MUSIC[track]);
        el.loop = true;
        const src = this._ctx.createMediaElementSource(el);
        src.connect(this._musicGain);
        el.play().catch(() => {});
        this._music = el;
    }

    _stopMusic() {
        if (!this._music) return;
        this._music.pause();
        this._music = null;
        this._musicTrack = null;
    }

    startExploreMusic() {
        this._playMusic("explore");
    }
    startRaceMusic() {
        this._playMusic("race");
    }

    // --- synthesized sfx ---

    playJump() {
        if (!this._ctx) return;
        const t = this._ctx.currentTime;
        const osc = this._ctx.createOscillator();
        const gain = this._ctx.createGain();
        osc.connect(gain);
        gain.connect(this._ctx.destination);
        osc.type = "sine";
        osc.frequency.setValueAtTime(320, t);
        osc.frequency.exponentialRampToValueAtTime(680, t + 0.12);
        gain.gain.setValueAtTime(0.28, t);
        gain.gain.exponentialRampToValueAtTime(0.001, t + 0.22);
        osc.start(t);
        osc.stop(t + 0.22);
    }

    playRing() {
        if (!this._ctx) return;
        const t = this._ctx.currentTime;
        // two-tone chime
        [880, 1320].forEach((freq, i) => {
            const osc = this._ctx.createOscillator();
            const gain = this._ctx.createGain();
            osc.connect(gain);
            gain.connect(this._ctx.destination);
            osc.type = "sine";
            osc.frequency.value = freq;
            const start = t + i * 0.04;
            gain.gain.setValueAtTime(0.2, start);
            gain.gain.exponentialRampToValueAtTime(0.001, start + 0.28);
            osc.start(start);
            osc.stop(start + 0.28);
        });
    }

    playCheckpoint() {
        if (!this._ctx) return;
        const t = this._ctx.currentTime;
        [523, 659, 784].forEach((freq, i) => {
            const osc = this._ctx.createOscillator();
            const gain = this._ctx.createGain();
            osc.connect(gain);
            gain.connect(this._ctx.destination);
            osc.type = "triangle";
            osc.frequency.value = freq;
            const start = t + i * 0.1;
            gain.gain.setValueAtTime(0.22, start);
            gain.gain.exponentialRampToValueAtTime(0.001, start + 0.35);
            osc.start(start);
            osc.stop(start + 0.35);
        });
    }

    playFinish() {
        if (!this._ctx) return;
        const t = this._ctx.currentTime;
        // triumphant ascending arpeggio
        [523, 659, 784, 1047].forEach((freq, i) => {
            const osc = this._ctx.createOscillator();
            const gain = this._ctx.createGain();
            osc.connect(gain);
            gain.connect(this._ctx.destination);
            osc.type = "square";
            osc.frequency.value = freq;
            const start = t + i * 0.12;
            gain.gain.setValueAtTime(0.12, start);
            gain.gain.exponentialRampToValueAtTime(0.001, start + 0.5);
            osc.start(start);
            osc.stop(start + 0.5);
        });
    }
}
