const VALID_FIGMA_ORIGINS = ['www.figma.com', 'figma.com'];

function withHttp(url: string) {
	return !/^https?:\/\//i.test(url) ? `http://${url}` : url;
}

class FigmaURLError extends Error {
	constructor(message: string) {
		super(message);
		this.name = 'FigmaURLError';
	}
}

export function parseTeamIdFromFigmaUrl(figmaUrl: string): string {
	try {
		const url = new URL(withHttp(figmaUrl));
		if (!VALID_FIGMA_ORIGINS.includes(url.hostname)) {
			throw new FigmaURLError('Invalid Figma URL');
		}
		const pathname = url.pathname;
		const teamIdRegex = /\/files\/\d+\/team\/(\d+)/;
		const match = pathname.match(teamIdRegex);
		if (!match || !match[1]) {
			throw new FigmaURLError('Unable to parse team ID from Figma URL');
		}

		return match[1];
	} catch (e) {
		if (e instanceof FigmaURLError) {
			throw e;
		} else {
			console.error(e);
			throw new FigmaURLError('Failed to parse URL');
		}
	}
}
