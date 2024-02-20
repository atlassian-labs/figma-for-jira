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

export const truncate = (str: string, maxLength: number): string => {
	const utf8Str = Buffer.from(str, 'utf-8');
	if (utf8Str.length <= maxLength) return utf8Str.toString();

	return `${utf8Str.subarray(0, maxLength - 1).toString()}…`;
};
