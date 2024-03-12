// eslint-disable-next-line import/no-unassigned-import
import 'core-js/proposals/well-formed-unicode-strings';

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

/**
 * Returns a string truncates to the given length.
 *
 * When the string is truncated, the last character is replaced with "…".
 *
 * If the truncation causes the presence of a lone surrogate, it is excluded from a returned string.
 */
export const truncate = (str: string, maxLength: number) => {
	if (str.length <= maxLength) return str;

	// TODO: The current version of TypeScript does not include the type definition
	// 	for `String.prototype.isWellFormed` and `String.prototype.toWellFormed`, available in Node.js 20:
	//  https://github.com/microsoft/TypeScript/issues/55543
	//  Remove when the project is updated to TypeScript 5.3.
	type Node20String = string & {
		toWellFormed(): Node20String;
		isWellFormed(): boolean;
	};

	const result = (str as Node20String).toWellFormed().slice(0, maxLength - 1);

	if ((result as Node20String).isWellFormed()) return `${result}…`;

	return `${result.slice(0, -1)}…`;
};
