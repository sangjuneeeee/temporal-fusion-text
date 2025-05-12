# Temporal-Fusion-Text

![npm version](https://img.shields.io/npm/v/@sangjuneeeee/temporal-fusion-text)
![npm bundle size](https://img.shields.io/bundlephobia/minzip/@sangjuneeeee/temporal-fusion-text)
![license](https://img.shields.io/npm/l/@sangjuneeeee/temporal-fusion-text)

# Temporal-Fusion Secure Display

## 🚧 Status: Experimental / Alpha

This library is currently in **early development** (version `0.x`). It provides a working prototype of temporal-fusion display but lacks some features and optimizations.

Please consider it an **alpha** release. Feedback, issues, and pull requests are welcome to help improve and stabilize the package.

---

## 📄 Abstract / TL;DR

- **Problem**: Static screenshots (or single frames) leak sensitive text content (e.g., exam questions, proprietary documents).
- **Solution**: Temporal‑fusion display toggles between two glyph‑subsets at ≥2× monitor refresh rate.

  - Any single captured frame shows only partial, meaningless glyphs.
  - Human visual persistence integrates consecutive frames into coherent text.

- **Use Case**:

  - In online exams, this technique may help prevent cheating or information leakage via screen recording, OCR, or AI-based real-time transcription tools.

- **Contributions**:

  1. Pure‑JS/Canvas reference implementation with off‑screen double buffering.
  2. Automatic refresh‑rate detection & graceful degradation on low‑Hz devices.
  3. Accessibility and flicker‑safe guidelines, performance metrics, and packaging for npm.

---

## ⚠️ Threat Model

- **Adversary**: Any user with ability to capture screenshots, record video, or apply standard OCR tools (or real-time AI transcription).
- **Assumptions**:

  - Cannot physically record monitor at >2× refresh rate without specialized hardware.
  - Cannot reconstruct full content from non-integrated frames.

- **Defense Scope**:

  - Prevent leakage via static capture, screen-share, or simple video OCR.
  - A supplementary frontend-level method for use in lightweight DRM or exam platforms.

---

## 🧮 Algorithm & Pseudo‑code

1. **Detect Refresh**: estimate device refresh by two consecutive `requestAnimationFrame` samples.
2. **Set Frequency**: `swapInterval = 1000 / (2 × refreshRate)`.
3. **Partition Glyphs**: text → array of glyphs; even indices → buffer A, odd → buffer B.
4. **Off‑screen Buffers**: draw buffers A/B once.
5. **Loop**: every `swapInterval`, toggle parity; `drawImage(buffer[parity])` each rAF.

```js
// main loop
function loop(now) {
  if (now - lastSwap >= swapInterval) {
    parity ^= 1;
    lastSwap = now;
  }
  ctx.clearRect(...);
  ctx.drawImage(buffers[parity], 0, 0);
  requestAnimationFrame(loop);
}
```

---

## 💻 Implementation & Usage

### Installation (npm)

```bash
npm install temporal-fusion-text
```

### API

```ts
import { TemporalFusionText } from "temporal-fusion-text";

const canvas = document.querySelector("#myCanvas");
const fusion = new TemporalFusionText(canvas, "Confidential: Q1. Solve quickly.", {
	font: "28px sans-serif",
	color: "#606060",
	opacity: 0.55,
	minSafeHz: 120,
});
fusion.run();
```

### CLI / Demo

- `demo/index.html`: hosted via GitHub Pages.
- `npm run start` → local server.

---

## ⚖️ Limitations & Accessibility

- **Low‑Hz fallback**: if `2× refresh < minSafeHz`, static text + warning banner.
- **Accessibility**:

  - Supports `prefers-reduced-motion`: auto‑disable fusion.
  - ARIA labels on canvas.

- **Epilepsy Warning**: flicker at >120 Hz could affect photosensitive users.

---

## 📦 Package & Distribution

- **Module**: ESM build (`dist/index.js`), CJS (`dist/index.cjs.js`).
- **Types**: TypeScript definitions in `dist/index.d.ts`.
- **License**: MIT.

---

## 🤝 Contributing & Roadmap

- _v1.1_: WebGL accelerated version.
- _v1.2_: Partial‑glyph OTF font generator.
- _v2.0_: Image‑mode (raster content).

Contributions welcome via PRs or issues on GitHub.

---

© 2025 Sangjune Park — MIT License
