export function isString(value: unknown): value is string {
	return typeof value === 'string';
}

/**
 * @throws {TypeError} The given value is not a string.
 */
export const ensureString = (value: unknown) => {
	if (isString(value)) return value;
	throw new TypeError(
		`The provided value is not of the correct type. Expected string, but received: ${typeof value}`,
	);
};
