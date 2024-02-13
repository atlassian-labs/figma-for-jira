export function getRandomInt(min: number, max: number): number {
	min = Math.ceil(min);
	max = Math.floor(max);
	return Math.floor(Math.random() * (max - min) + min);
}

export function generateNumericId(): string {
	const id = getRandomInt(1, Number.MAX_SAFE_INTEGER);

	return BigInt(id).toString();
}

export function generateNumericStringId(): string {
	return generateNumericId().toString();
}

/**
 * Flushes a Macrotask queue by scheduling a new Macrotask and waiting for its immediate execution.
 *
 * @see https://javascript.info/event-loop
 */
export const flushMacrotaskQueue = () => new Promise(setImmediate);
