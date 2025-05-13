/**
 * @module temporal-fusion-text
 * @description
 * A browser-native TypeScript library for rendering text that is only
 * human-readable when frames are temporally integrated, but
 * indecipherable in any single screenshot or static frame.
 *
 * @license MIT © 2025 sangjuneeeee
 */

///////////////////////
// Public Interfaces //
///////////////////////

/**
 * Configuration options for temporal-fusion rendering.
 */
export interface FusionOptions {
	/** CSS font string, e.g. `"32px sans-serif"`. Default: `32px "Segoe UI", sans-serif`. */
	font?: string;
	/** fillStyle for glyphs. Default: `"#808080"`. */
	color?: string;
	/** globalAlpha for glyphs (0.0–1.0). Default: `0.55`. */
	opacity?: number;
	/**
	 * Minimum `refreshRate * 2` to enable fusion.
	 * If device runs slower or user prefers reduced motion,
	 * library falls back to a single static render.
	 * Default: `120`.
	 */
	minSafeHz?: number;
	/** horizontal padding (px). Default: `40`. */
	marginX?: number;
	/** vertical padding (px). Default: `36`. */
	marginY?: number;
	/** line spacing (px). Default: `48`. */
	lineHeight?: number;
}

/**
 * Result of rendering: an array of booleans indicating
 * whether temporal-fusion mode was active per paragraph.
 */
export type FusionResults = boolean[];

//////////////////////////
// Internal Declarations //
//////////////////////////

interface InternalOptions extends Required<FusionOptions> {}
const DEFAULT_OPTIONS: InternalOptions = {
	font: '32px "Segoe UI", sans-serif',
	color: "#808080",
	opacity: 0.55,
	minSafeHz: 120,
	marginX: 40,
	marginY: 36,
	lineHeight: 48,
};

////////////////////////
// Core Class & API  //
////////////////////////

/**
 * TemporalFusionText
 *
 * Low-level class that renders a single paragraph of text
 * into the given canvas element using temporal frame-fusion.
 *
 * You normally do not need to instantiate this directly;
 * see `renderTemporalFusionParagraphs` for multi-paragraph support.
 */
export class TemporalFusionText {
	private canvas: HTMLCanvasElement;
	private ctx: CanvasRenderingContext2D;
	private opts: InternalOptions;
	private charLayout: Array<{ ch: string; x: number; y: number }>;

	private offA: CanvasRenderingContext2D;
	private offB: CanvasRenderingContext2D;
	private parity: 0 | 1 = 0;
	private lastSwap = 0;
	private swapInterval = 0;

	/**
	 * @param canvas Target canvas element (sized to fit text).
	 * @param text   Single paragraph text (supports `\n` for explicit line breaks).
	 * @param opts   Partial options to override defaults.
	 */
	constructor(canvas: HTMLCanvasElement, text: string, opts: FusionOptions = {}) {
		const ctx = canvas.getContext("2d");
		if (!ctx) throw new Error("Cannot acquire 2D context");
		this.canvas = canvas;
		this.ctx = ctx;
		this.opts = { ...DEFAULT_OPTIONS, ...opts };
		// layout & buffers
		this.charLayout = TemporalFusionText.computeLayout(text, canvas.width, this.opts);
		this.offA = this.createOffscreen();
		this.offB = this.createOffscreen();
		this.renderBuffers();
	}

	/** Estimate monitor refresh by averaging two RAF intervals. */
	private static async detectRefresh(): Promise<number> {
		const t0 = performance.now();
		await new Promise(requestAnimationFrame);
		await new Promise(requestAnimationFrame);
		const t2 = performance.now();
		return Math.round(1000 / ((t2 - t0) / 2));
	}

	/** Precompute x/y for each glyph, wrapping at right margin. */
	public static computeLayout(
		text: string,
		width: number,
		opts: InternalOptions
	): Array<{ ch: string; x: number; y: number }> {
		const { font, marginX, marginY, lineHeight } = opts;
		const ctx = document.createElement("canvas").getContext("2d")!;
		ctx.font = font;
		ctx.textBaseline = "top";

		const layout: Array<{ ch: string; x: number; y: number }> = [];
		let x = marginX,
			y = marginY;
		const maxX = width - marginX;

		for (const ch of text) {
			if (ch === "\n") {
				x = marginX;
				y += lineHeight;
				continue;
			}
			const w = ctx.measureText(ch).width;
			if (x + w > maxX) {
				x = marginX;
				y += lineHeight;
			}
			layout.push({ ch, x, y });
			x += w + 2;
		}
		return layout;
	}

	/** Create an off-screen canvas 2D context matching main canvas. */
	private createOffscreen(): CanvasRenderingContext2D {
		const off = document.createElement("canvas");
		off.width = this.canvas.width;
		off.height = this.canvas.height;
		const ctx = off.getContext("2d");
		if (!ctx) throw new Error("Cannot create offscreen context");
		return ctx;
	}

	/** Draw even/odd glyph sets into off-screen contexts once. */
	private renderBuffers(): void {
		const { font, color, opacity } = this.opts;
		for (const ctx of [this.offA, this.offB]) {
			ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
			ctx.font = font;
			ctx.textBaseline = "top";
			ctx.fillStyle = color;
			ctx.globalAlpha = opacity;
		}
		this.charLayout.forEach(({ ch, x, y }, i) => {
			const target = i % 2 === 0 ? this.offA : this.offB;
			target.fillText(ch, x, y);
		});
	}

	/** Paint static text (fallback for low refresh or reduced motion). */
	private renderStatic(): void {
		const { font } = this.opts;
		this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
		this.ctx.font = font;
		this.ctx.textBaseline = "top";
		this.ctx.fillStyle = "#ffffff";
		this.charLayout.forEach(({ ch, x, y }) => {
			this.ctx.fillText(ch, x, y);
		});
	}

	/** The RAF loop that toggles parity and blits the appropriate buffer. */
	private loop = (now: number): void => {
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
	 * Begin rendering. Returns `true` if temporal fusion is active,
	 * or `false` if static fallback was used.
	 */
	public async run(): Promise<boolean> {
		const refresh = await TemporalFusionText.detectRefresh();
		const safeHz = refresh * 2;
		if (
			safeHz < this.opts.minSafeHz ||
			window.matchMedia("(prefers-reduced-motion: reduce)").matches
		) {
			this.renderStatic();
			return false;
		}
		this.swapInterval = 1000 / safeHz;
		requestAnimationFrame(this.loop);
		return true;
	}
}

/**
 * Render multiple paragraphs into a container element.
 * For each paragraph, a canvas is created and appended,
 * sized automatically to fit content, and protected by
 * temporal fusion. Returns array of booleans per paragraph.
 *
 * @param container  DOM element that will host canvases.
 * @param paragraphs Array of paragraph strings.
 * @param opts       FusionOptions & `{ width?: number }`; width defaults to `container.clientWidth`.
 * @returns          Promise resolving to an array indicating fusion-enabled per paragraph.
 */
export async function renderTemporalFusionParagraphs(
	container: HTMLElement,
	paragraphs: string[],
	opts: FusionOptions & { width?: number } = {}
): Promise<FusionResults> {
	const results: boolean[] = [];
	const width = opts.width ?? container.clientWidth;

	for (const text of paragraphs) {
		// compute required height
		const layout = TemporalFusionText.computeLayout(text, width, { ...DEFAULT_OPTIONS, ...opts });
		const maxY = Math.max(...layout.map((c) => c.y));
		const height =
			maxY +
			(opts.lineHeight ?? DEFAULT_OPTIONS.lineHeight) +
			(opts.marginY ?? DEFAULT_OPTIONS.marginY);

		// create and size canvas
		const canvas = document.createElement("canvas");
		canvas.width = width;
		canvas.height = height;
		container.appendChild(canvas);

		// render
		const fusion = new TemporalFusionText(canvas, text, opts);
		const active = await fusion.run();
		results.push(active);
	}

	return results;
}

export default renderTemporalFusionParagraphs;
