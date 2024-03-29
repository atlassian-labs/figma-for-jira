import { fromExpressRequest } from 'atlassian-jwt';
import type { Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';

import { jiraAsymmetricJwtAuthenticationMiddleware } from './jira-asymmetric-jwt-authentication-middleware';

import { flushMacrotaskQueue } from '../../../common/testing/utils';
import { jiraAsymmetricJwtTokenVerifier } from '../../../infrastructure/jira/inbound-auth';
import { UnauthorizedResponseStatusError } from '../../errors';

describe('jiraAsymmetricJwtAuthenticationMiddleware', () => {
	it('should authenticate request with valid token ', async () => {
		const token = uuidv4();
		const request = {
			headers: {
				authorization: `JWT ${token}`,
			},
		} as Request;
		const next = jest.fn();
		jest.spyOn(jiraAsymmetricJwtTokenVerifier, 'verify').mockResolvedValue();

		jiraAsymmetricJwtAuthenticationMiddleware(request, {} as Response, next);
		await flushMacrotaskQueue();

		expect(next).toHaveBeenCalledWith();
		expect(jiraAsymmetricJwtTokenVerifier.verify).toHaveBeenCalledWith(
			token,
			fromExpressRequest(request),
		);
	});

	it('should not authenticate request with invalid JWT token ', async () => {
		const token = uuidv4();
		const request = {
			headers: {
				authorization: `JWT ${token}`,
			},
		} as Request;
		const next = jest.fn();
		const error = new Error();
		jest
			.spyOn(jiraAsymmetricJwtTokenVerifier, 'verify')
			.mockRejectedValue(new Error());

		jiraAsymmetricJwtAuthenticationMiddleware(request, {} as Response, next);
		await flushMacrotaskQueue();

		expect(next).toHaveBeenCalledWith(
			new UnauthorizedResponseStatusError('Unauthorized.', undefined, error),
		);
	});

	it('should not authenticate request with no token', async () => {
		const request = {
			headers: {},
		} as Request;
		const next = jest.fn();

		jiraAsymmetricJwtAuthenticationMiddleware(request, {} as Response, next);
		await flushMacrotaskQueue();

		expect(next).toHaveBeenCalledWith(
			new UnauthorizedResponseStatusError('Missing JWT token.'),
		);
	});
});
