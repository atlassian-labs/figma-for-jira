const VALID_FIGMA_ORIGINS = ['www.figma.com', 'figma.com'];

if (import.meta.env.VITE_FIGMA_FOR_JIRA_FIGMA_WEB_DOMAIN) {
	VALID_FIGMA_ORIGINS.push(
		import.meta.env.VITE_FIGMA_FOR_JIRA_FIGMA_WEB_DOMAIN,
	);
}

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
		const orgTeamRegex = /\/files\/\d+\/team\/(\d+)/;
		const orgTeamMatch = pathname.match(orgTeamRegex);
		if (orgTeamMatch && orgTeamMatch[1]) {
			return orgTeamMatch[1];
		}

		const starterTeamRegex = /\/files\/team\/(\d+)/;
		const starterTeamMatch = pathname.match(starterTeamRegex);
		if (starterTeamMatch && starterTeamMatch[1]) {
			return starterTeamMatch[1];
		}

		throw new FigmaURLError('Unable to parse team ID from Figma URL');
	} catch (e) {
		if (e instanceof FigmaURLError) {
			throw e;
		} else {
			console.error(e);
			throw new FigmaURLError('Failed to parse URL');
		}
	}
}
