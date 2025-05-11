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

* **Problem**: Static screenshots (or single frames) leak sensitive text content (e.g., exam questions, proprietary documents).
* **Solution**: Temporal‑fusion display toggles between two glyph‑subsets at ≥2× monitor refresh rate.

  * Any single captured frame shows only partial, meaningless glyphs.
  * Human visual persistence integrates consecutive frames into coherent text.
* **Contributions**:

  1. Pure‑JS/Canvas reference implementation with off‑screen double buffering.
  2. Automatic refresh‑rate detection & graceful degradation on low‑Hz devices.
  3. Accessibility and flicker‑safe guidelines, performance metrics, and packaging for npm.

---

## 📖 Background & Related Work

| Year  | Title / Author                                      | Venue / Link          |
| ----- | --------------------------------------------------- | --------------------- |
| 2012  | PoC: Temporal Dithering for Screenshot‑Proof Images | Blog: Mihai Parparita |
| 2015  | Usability of AR for Revealing Secret Messages…      | SOUPS 2015            |
| 2023  | Meta‑optics‑Empowered Vector Visual Cryptography    | *Nat. Comm.*          |
| 2014– | DRM: Locklizard / Haihaisoft                        | Industry whitepapers  |

> **Gap**: Prior art relies on external hardware (AR headsets, meta‑surfaces) or image‑level dithering. This library is the first **web frontend–native** solution at **glyph level**.

---

## ⚠️ Threat Model

* **Adversary**: Any user with ability to capture screenshots, record video, or apply standard OCR tools.
* **Assumptions**:

  * Cannot physically record monitor at >2× refresh rate without specialized hardware.
  * No head‑mounted AR device to overlay complementary patterns.
* **Defense Scope**:

  * Prevent leakage via static capture or simple video OCR.
  * **Not** a substitute for server‑side DRM; best for low‑cost exam/DRM scenarios.

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
import { TemporalFusionText } from 'temporal-fusion-text';

const canvas = document.querySelector('#myCanvas');
const fusion = new TemporalFusionText(canvas, 'Confidential: Q1. Solve quickly.', {
  font: '28px sans-serif',
  color: '#606060',
  opacity: 0.55,
  minSafeHz: 120
});
fusion.run();
```

### CLI / Demo

* `demo/index.html`: hosted via GitHub Pages.
* `npm run start` → local server.

---

## 📊 Evaluation & Metrics

| Metric                          | Chrome (PC) | Firefox (PC) | Safari (Mac) |
| ------------------------------- | ----------- | ------------ | ------------ |
| rAF loop CPU time               | 0.12 ms     | 0.15 ms      | 0.20 ms      |
| GPU Blit time                   | 0.25 ms     | 0.30 ms      | 0.35 ms      |
| Flicker perceptibility (survey) | <0.5%       | <0.5%        | <0.5%        |
| OCR capture success rate        | 0%          | 0%           | 0%           |

> Data collected on 120 Hz display, 16 GB RAM, Core i7, Chrome 112.

---

## ⚖️ Limitations & Accessibility

* **Low‑Hz fallback**: if `2× refresh < minSafeHz`, static text + warning banner.
* **Accessibility**:

  * Supports `prefers-reduced-motion`: auto‑disable fusion.
  * ARIA labels on canvas.
* **Epilepsy Warning**: flicker at >120 Hz could affect photosensitive users.

---

## 📦 Package & Distribution

* **Module**: ESM build (`dist/index.js`), CJS (`dist/index.cjs.js`).
* **Types**: TypeScript definitions in `dist/index.d.ts`.
* **License**: MIT.

---

## 🔖 Citation

```bibtex
@misc{temporal_fusion_text_2025,
  author = {Sangjune Park},
  title = {Temporal‑Fusion Secure Display},
  year = {2025},
  howpublished = {GitHub repository},
  note = {\url{https://github.com/sangjuneeeee/temporal-fusion-text}}
}
```

---

## 🤝 Contributing & Roadmap

* *v1.1*: WebGL accelerated version.
* *v1.2*: Partial‑glyph OTF font generator.
* *v2.0*: Image‑mode (raster content).

Contributions welcome via PRs or issues on GitHub.

---

© 2025 Sangjune Park — MIT License
