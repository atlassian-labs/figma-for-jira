/**
 * Returns a new Date truncated to milliseconds by setting milliseconds to zero.
 */
export function truncateToMillis(value: Date): Date {
	const result = new Date(value.getTime());

	result.setMilliseconds(0);

	return new Date(result);
}
