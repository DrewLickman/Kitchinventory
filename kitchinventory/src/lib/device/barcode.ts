import { browser } from '$app/environment';
import { BrowserMultiFormatReader, type IScannerControls } from '@zxing/browser';

export type BarcodeFormat = string;

export interface ScanResult {
	code: string;
	format?: BarcodeFormat;
}

type BarcodeDetectorLike = {
	detect: (image: ImageBitmapSource) => Promise<Array<{ rawValue: string; format: string }>>;
};

function hasBarcodeDetector(): boolean {
	return browser && typeof (globalThis as unknown as { BarcodeDetector?: unknown }).BarcodeDetector !== 'undefined';
}

function createBarcodeDetector(): BarcodeDetectorLike {
	const Ctor = (globalThis as unknown as { BarcodeDetector: new () => BarcodeDetectorLike }).BarcodeDetector;
	return new Ctor();
}

export async function scanFromVideoElement(
	video: HTMLVideoElement,
	onResult: (result: ScanResult) => void
): Promise<() => void> {
	// Prefer native BarcodeDetector if available (fast, battery-friendly).
	if (hasBarcodeDetector()) {
		const detector = createBarcodeDetector();

		let cancelled = false;
		const tick = async () => {
			if (cancelled) return;
			try {
				const bitmap = await createImageBitmap(video);
				const results = await detector.detect(bitmap);
				bitmap.close();
				if (results.length > 0) {
					onResult({ code: results[0].rawValue, format: results[0].format });
				}
			} catch {
				// ignore transient decode errors
			} finally {
				if (!cancelled) requestAnimationFrame(tick);
			}
		};

		requestAnimationFrame(tick);
		return () => {
			cancelled = true;
		};
	}

	// Fallback: ZXing (broader browser support).
	const reader = new BrowserMultiFormatReader();
	let controls: IScannerControls | null = null;

	controls = await reader.decodeFromVideoElement(video, (result, _err, ctl) => {
		controls = ctl ?? controls;
		if (!result) return;
		onResult({
			code: result.getText(),
			format: result.getBarcodeFormat()?.toString?.()
		});
	});

	return () => {
		try {
			controls?.stop();
		} catch {
			// ignore
		}
	};
}

