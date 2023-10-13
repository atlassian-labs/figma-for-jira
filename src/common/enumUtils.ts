export const isEnumValueOf = <T>(
	enumeration: Record<string, T>,
	value: unknown,
): value is T => {
	const enumerationValues: Set<unknown> = new Set(Object.values(enumeration));

	return enumerationValues.has(value);
};
