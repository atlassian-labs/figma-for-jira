/**
 * Returns true of the value is not `null` or `undefined`.
 */
export const isNotNullOrUndefined = <T>(
	value: T | null | undefined,
): value is T => {
	return value != null;
};
