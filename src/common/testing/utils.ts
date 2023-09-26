export function getRandomInt(min: number, max: number): number {
	min = Math.ceil(min);
	max = Math.floor(max);
	return Math.floor(Math.random() * (max - min) + min);
}

export function getRandomNumericId(): bigint {
	const id = getRandomInt(1, Number.MAX_SAFE_INTEGER);

	return BigInt(id);
}
