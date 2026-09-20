export function formatOuts(value: number | null): string {
	if (value === null) return 'Unavailable';
	const innings = Math.floor(value / 3);
	const outs = value % 3;
	if (outs === 0) return `${innings} innings`;
	return `${innings} innings + ${outs} out${outs === 1 ? '' : 's'}`;
}

export function formatCount(value: number | null): string {
	return value === null ? 'Unavailable' : String(value);
}

export function formatMetric(
	metric: {
		status: 'available' | 'unavailable';
		value: string | null;
		unit: string;
		reason?: string;
	},
	options: { withUnit?: boolean } = {}
): string {
	if (metric.status === 'unavailable' || metric.value === null) {
		return `Unavailable — ${metric.reason ?? 'required input is missing'}`;
	}
	return options.withUnit ? `${metric.value} ${metric.unit}` : metric.value;
}

export function formatSavedAt(value: string | null): string {
	if (value === null) return 'Not saved locally';
	const date = new Date(value);
	return Number.isNaN(date.valueOf()) ? value : `Saved ${date.toLocaleString()}`;
}

export function statusLabel(value: string): string {
	return value.replaceAll('_', ' ').replace(/\b\w/g, (character) => character.toUpperCase());
}
