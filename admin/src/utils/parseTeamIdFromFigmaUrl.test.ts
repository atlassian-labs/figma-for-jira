import { parseTeamIdFromFigmaUrl } from './parseTeamIdFromFigmaUrl';

describe('parseTeamIdFromFigmaUrl', () => {
	it('throws an error if the URL is not a Figma URL', () => {
		const url = 'https://foo.com';
		expect(() => parseTeamIdFromFigmaUrl(url)).toThrowError(
			'Invalid Figma URL',
		);
	});

	it('returns the team ID for a starter team', () => {
		const url = 'https://www.figma.com/files/team/123/Project-Name';
		expect(parseTeamIdFromFigmaUrl(url)).toEqual('123');
	});

	it('returns the team ID for an org team', () => {
		const url =
			'https://www.figma.com/files/456/team/123/another-cool-team?fuid=678';
		expect(parseTeamIdFromFigmaUrl(url)).toEqual('123');
	});
});
