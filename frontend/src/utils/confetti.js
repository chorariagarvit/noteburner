import confetti from 'canvas-confetti';

// canvas-confetti runs in a Web Worker created from a blob: URL by default, which our
// Content-Security-Policy (worker-src 'self') rightly blocks. Drawing on the main thread needs no
// worker, so the policy can stay strict. (The effect is small; the cost is negligible.)
export const fireConfetti = confetti.create(undefined, { resize: true, useWorker: false });
