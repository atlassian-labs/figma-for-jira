export const tryParseUrl = (url: string): URL | undefined => {
	try {
		return new URL(url);
	} catch (e) {
		return undefined;
	}
};
