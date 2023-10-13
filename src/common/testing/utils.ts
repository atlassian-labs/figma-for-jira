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

export const flushPromises = () => new Promise(setImmediate);
