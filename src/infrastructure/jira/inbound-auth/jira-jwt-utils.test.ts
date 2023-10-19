import { createQueryStringHash } from 'atlassian-jwt';

import { verifyQshClaimBoundToUrl } from './jira-jwt-utils';

import { UnauthorizedError } from '../../../web/middleware/errors';

const NOW = Date.now();

describe('verifyQshClaimBoundToUrl', () => {
	beforeEach(() => {
		jest.useFakeTimers().setSystemTime(NOW);
	});

	afterEach(() => {
		jest.useRealTimers();
	});

	it('throws on invalid qsh claims', () => {
		expect(() =>
			verifyQshClaimBoundToUrl(
				{ qsh: 'invalid-qsh' },
				{
					method: 'GET',
					pathname: '/foo',
					query: {},
				},
			),
		).toThrowError(UnauthorizedError);
	});

	it('passes on valid qsh claims', () => {
		const request = {
			method: 'GET',
			pathname: '/foo',
			query: {},
		};

		const qsh = createQueryStringHash(request, false);
		expect(() => verifyQshClaimBoundToUrl({ qsh }, request)).not.toThrowError();
	});

	it('passes when the qsh is context-qsh', () => {
		expect(() =>
			verifyQshClaimBoundToUrl(
				{ qsh: 'context-qsh' },
				{
					method: 'GET',
					pathname: '/foo',
					query: {},
				},
			),
		).not.toThrowError(UnauthorizedError);
	});
});
