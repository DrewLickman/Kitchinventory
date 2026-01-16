export function downloadJson(filename: string, data: unknown): void {
	const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
	const url = URL.createObjectURL(blob);

	const a = document.createElement('a');
	a.href = url;
	a.download = filename;
	a.rel = 'noopener';
	a.click();

	// allow navigation to start before revoking
	setTimeout(() => URL.revokeObjectURL(url), 0);
}

export async function readJsonFile(file: File): Promise<unknown> {
	const text = await file.text();
	return JSON.parse(text) as unknown;
}

