/**
 * Returns an array of unique items based on the given comparator.
 */
export function uniqueWith<T>(
	value: T[],
	equalsFn: (x: T, y: T) => boolean,
): T[] {
	const result: T[] = [];

	for (const item of value) {
		if (result.some((resultItem) => equalsFn(resultItem, item))) continue;

		result.push(item);
	}

	return result;
}
