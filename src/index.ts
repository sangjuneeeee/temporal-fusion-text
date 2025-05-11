/**
 * Temporal-Fusion Text Display Library
 *
 * This library renders text that is only human-readable when frames
 * are temporally integrated, but indecipherable in any single frame or screenshot.
 *
 * MIT License © 2025 sangjuneeeee
 */

export interface FusionOptions {
	/** CSS font string, e.g. "32px sans-serif" */
	font?: string;
	/** Fill style for glyphs, default "#808080" */
	color?: string;
	/** Opacity for glyphs (0.0–1.0), default 0.55 */
	opacity?: number;
	/** Minimum (refreshRate * 2) to enable temporal fusion, default 120 */
	minSafeHz?: number;
	/** Horizontal margin in px, default 40 */
	marginX?: number;
	/** Vertical margin in px, default 36 */
	marginY?: number;
	/** Line height in px for auto-wrapping, default 48 */
	lineHeight?: number;
}

/**
 * Main class that handles temporal-fusion text rendering to a Canvas.
 */
export class TemporalFusionText {
	private canvas: HTMLCanvasElement;
	private ctx: CanvasRenderingContext2D;
	private text: string;
	private opts: Required<FusionOptions>;

	private offA: CanvasRenderingContext2D;
	private offB: CanvasRenderingContext2D;
	private charInfo: Array<{ ch: string; x: number; y: number }>;

	private parity: 0 | 1 = 0;
	private lastSwap = 0;
	private swapInterval = 0;
	private safeHz = 0;

	/**
	 * @param canvas HTMLCanvasElement to render into
	 * @param text Text content (supports "\n" for newlines)
	 * @param opts  Partial options to customize rendering
	 */
	constructor(canvas: HTMLCanvasElement, text: string, opts: FusionOptions = {}) {
		this.canvas = canvas;
		const ctx = canvas.getContext("2d");
		if (!ctx) {
			throw new Error("Unable to get 2D rendering context");
		}
		this.ctx = ctx;
		this.text = text;
		// apply defaults
		this.opts = {
			font: '32px "Segoe UI", sans-serif',
			color: "#808080",
			opacity: 0.55,
			minSafeHz: 120,
			marginX: 40,
			marginY: 36,
			lineHeight: 48,
			...opts,
		};
		// prepare off-screen buffers and layout
		this.offA = this.createOffscreen();
		this.offB = this.createOffscreen();
		this.charInfo = this.computeLayout();
		this.renderBuffers();
	}

	/** Estimate monitor refresh rate (samples two RAF frames). */
	private static async detectRefresh(): Promise<number> {
		const t0 = performance.now();
		await new Promise(requestAnimationFrame);
		const t1 = performance.now();
		await new Promise(requestAnimationFrame);
		const t2 = performance.now();
		// average of two frame intervals
		return Math.round(1000 / ((t2 - t0) / 2));
	}

	/** Create an offscreen canvas context matching the main canvas. */
	private createOffscreen(): CanvasRenderingContext2D {
		const offscreen = document.createElement("canvas");
		offscreen.width = this.canvas.width;
		offscreen.height = this.canvas.height;
		const ctx = offscreen.getContext("2d");
		if (!ctx) {
			throw new Error("Unable to create offscreen 2D context");
		}
		return ctx;
	}

	/** Layout each character with auto-wrapping within margins. */
	private computeLayout() {
		const info: Array<{ ch: string; x: number; y: number }> = [];
		const { font, marginX, marginY, lineHeight } = this.opts;
		let x = marginX;
		let y = marginY;
		const maxX = this.canvas.width - marginX;
		this.ctx.font = font;
		this.ctx.textBaseline = "top";

		for (const ch of this.text) {
			if (ch === "\n") {
				x = marginX;
				y += lineHeight;
				continue;
			}
			const w = this.ctx.measureText(ch).width;
			if (x + w > maxX) {
				x = marginX;
				y += lineHeight;
			}
			info.push({ ch, x, y });
			x += w + 2;
		}
		return info;
	}

	/** Render odd/even glyph sets into off-screen buffers once. */
	private renderBuffers() {
		const { font, color, opacity } = this.opts;
		[this.offA, this.offB].forEach((offCtx) => {
			offCtx.clearRect(0, 0, offCtx.canvas.width, offCtx.canvas.height);
			offCtx.font = font;
			offCtx.textBaseline = "top";
			offCtx.fillStyle = color;
			offCtx.globalAlpha = opacity;
		});

		this.charInfo.forEach(({ ch, x, y }, i) => {
			const targetCtx = i % 2 === 0 ? this.offA : this.offB;
			targetCtx.fillText(ch, x, y);
		});
	}

	/** Render static text (fallback when fusion disabled). */
	private renderStatic() {
		this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
		this.ctx.font = this.opts.font;
		this.ctx.textBaseline = "top";
		this.ctx.fillStyle = "#ffffff";
		for (const { ch, x, y } of this.charInfo) {
			this.ctx.fillText(ch, x, y);
		}
	}

	/** Main animation loop: toggles buffers at calculated interval. */
	private loop = (now: number) => {
		if (now - this.lastSwap >= this.swapInterval) {
			this.parity ^= 1;
			this.lastSwap = now;
		}
		this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
		const src = this.parity ? this.offB.canvas : this.offA.canvas;
		this.ctx.drawImage(src, 0, 0);
		requestAnimationFrame(this.loop);
	};

	/**
	 * Start rendering. Returns true if temporal-fusion mode is active,
	 * false if fallback static mode is used.
	 */
	async run(): Promise<boolean> {
		const refresh = await TemporalFusionText.detectRefresh();
		this.safeHz = refresh * 2;
		if (
			this.safeHz < this.opts.minSafeHz ||
			window.matchMedia("(prefers-reduced-motion: reduce)").matches
		) {
			this.renderStatic();
			return false;
		}
		this.swapInterval = 1000 / this.safeHz;
		requestAnimationFrame(this.loop);
		return true;
	}
}

export default TemporalFusionText;
