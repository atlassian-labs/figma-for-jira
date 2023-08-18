export function readEnvVarString(key: string, fallback?: string): string {
	const value = process.env[key];
	if (value) {
		return value;
	}
	if (value === undefined && fallback !== undefined) {
		return fallback;
	}
	throw new Error(
		`Unable to read string environment variable ${key} and no fallback was specified`,
	);
}

export function readEnvVarInt(key: string, fallback?: number): number {
	const value = parseInt(process.env[key] ?? '');
	if (Number.isInteger(value)) {
		return value;
	}
	if (isNaN(value) && fallback !== undefined) {
		return fallback;
	}
	throw new Error(
		`Unable to read integer environment variable ${key} and no fallback was specified`,
	);
}
