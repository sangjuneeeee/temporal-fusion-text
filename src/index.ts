/**
 * Temporal-Fusion Text Display Library
 *
 * This library renders text that is only human-readable when frames
 * are temporally integrated, but indecipherable in any single frame or screenshot.
 *
 * MIT License © 2025 sangjuneeeee
 */

export interface FusionOptions {
	/** CSS font string, e.g. "32px sans-serif". Default: 32px "Segoe UI", sans-serif */
	font?: string;
	/** fillStyle for glyphs. Default: "#808080" */
	color?: string;
	/** globalAlpha for glyphs (0.0–1.0). Default: 0.55 */
	opacity?: number;
	/** Minimum refreshRate*2 to enable fusion. Fallback to static below. Default: 120 */
	minSafeHz?: number;
	/** horizontal padding (px). Default: 40 */
	marginX?: number;
	/** vertical padding (px). Default: 36 */
	marginY?: number;
	/** line spacing (px). Default: 48 */
	lineHeight?: number;
}

/** Internal fully-resolved options */
type InternalOptions = Required<FusionOptions>;

const DEFAULT_OPTIONS: InternalOptions = {
	font: '32px "Segoe UI", sans-serif',
	color: "#808080",
	opacity: 0.55,
	minSafeHz: 120,
	marginX: 40,
	marginY: 36,
	lineHeight: 48,
};

/**
 * Core renderer: renders a single paragraph on a given canvas
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
	 * @param canvas Target canvas element
	 * @param text   Paragraph text (supports "\n")
	 * @param opts   Partial options override
	 */
	constructor(canvas: HTMLCanvasElement, text: string, opts: FusionOptions = {}) {
		const ctx = canvas.getContext("2d");
		if (!ctx) throw new Error("Cannot get 2D context");
		this.canvas = canvas;
		this.ctx = ctx;
		this.opts = { ...DEFAULT_OPTIONS, ...opts };

		// layout characters
		this.charLayout = TemporalFusionText.computeLayout(text, canvas.width, this.opts);

		// prepare offscreen buffers
		this.offA = this.createOffscreen();
		this.offB = this.createOffscreen();
		this.renderBuffers();
	}

	/** Estimate monitor refresh from two RAF intervals */
	private static async detectRefresh(): Promise<number> {
		const t0 = performance.now();
		await new Promise(requestAnimationFrame);
		await new Promise(requestAnimationFrame);
		const t2 = performance.now();
		return Math.round(1000 / ((t2 - t0) / 2));
	}

	/** Precompute glyph positions with auto-wrap */
	public static computeLayout(
		text: string,
		width: number,
		opts: InternalOptions
	): Array<{ ch: string; x: number; y: number }> {
		const { font, marginX, marginY, lineHeight } = opts;
		// use offscreen context to measure
		const measureCtx = document.createElement("canvas").getContext("2d")!;
		measureCtx.font = font;
		measureCtx.textBaseline = "top";

		const layout: Array<{ ch: string; x: number; y: number }> = [];
		let x = marginX;
		let y = marginY;
		const maxX = width - marginX;

		for (const ch of text) {
			if (ch === "\n") {
				x = marginX;
				y += lineHeight;
				continue;
			}
			const w = measureCtx.measureText(ch).width;
			if (x + w > maxX) {
				x = marginX;
				y += lineHeight;
			}
			layout.push({ ch, x, y });
			x += w + 2;
		}
		return layout;
	}

	/** Create matching offscreen 2D context */
	private createOffscreen(): CanvasRenderingContext2D {
		const off = document.createElement("canvas");
		off.width = this.canvas.width;
		off.height = this.canvas.height;
		const ctx = off.getContext("2d");
		if (!ctx) throw new Error("Cannot create offscreen context");
		return ctx;
	}

	/** Draw even/odd glyphs once into offscreen buffers */
	private renderBuffers(): void {
		const { font, color, opacity } = this.opts;
		[this.offA, this.offB].forEach((c) => {
			c.clearRect(0, 0, c.canvas.width, c.canvas.height);
			c.font = font;
			c.textBaseline = "top";
			c.fillStyle = color;
			c.globalAlpha = opacity;
		});
		this.charLayout.forEach(({ ch, x, y }, i) => {
			const ctx = i % 2 === 0 ? this.offA : this.offB;
			ctx.fillText(ch, x, y);
		});
	}

	/** Paint fallback static text */
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

	/** RAF loop toggling buffers */
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

	/** Start rendering; returns true if fusion mode, false if fallback */
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
 * Render multiple paragraphs in a container.
 * Each paragraph gets its own canvas sized to fit content.
 */
export async function renderTemporalFusionParagraphs(
	// eslint-disable-next-line no-undef
	container: HTMLElement,
	paragraphs: string[],
	opts: FusionOptions & { width?: number } = {}
): Promise<boolean[]> {
	const results: boolean[] = [];
	const width = opts.width ?? container.clientWidth;

	for (const text of paragraphs) {
		// compute layout height
		const layout = TemporalFusionText.computeLayout(text, width, {
			...DEFAULT_OPTIONS,
			...opts,
		});
		const maxY = Math.max(...layout.map((c) => c.y));
		const height =
			maxY +
			(opts.lineHeight ?? DEFAULT_OPTIONS.lineHeight) +
			(opts.marginY ?? DEFAULT_OPTIONS.marginY);

		// setup canvas
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
