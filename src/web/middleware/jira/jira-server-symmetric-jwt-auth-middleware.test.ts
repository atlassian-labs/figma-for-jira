import { fromExpressRequest } from 'atlassian-jwt';
import type { Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';

import { jiraServerSymmetricJwtAuthMiddleware } from './jira-server-symmetric-jwt-auth-middleware';

import { flushPromises } from '../../../common/testing/utils';
import { generateConnectInstallation } from '../../../domain/entities/testing';
import { jiraServerSymmetricJwtTokenVerifier } from '../../../infrastructure/jira/inbound-auth';
import { UnauthorizedResponseStatusError } from '../../errors';

describe('jiraServerSymmetricJwtAuthMiddleware', () => {
	it('should authenticate request with valid token ', async () => {
		const connectInstallation = generateConnectInstallation();
		const token = uuidv4();
		const request = {
			headers: {
				authorization: `JWT ${token}`,
			},
		} as Request;
		const response = { locals: {} } as Response;
		const next = jest.fn();
		jest
			.spyOn(jiraServerSymmetricJwtTokenVerifier, 'verify')
			.mockResolvedValue({
				connectInstallation,
			});

		jiraServerSymmetricJwtAuthMiddleware(request, response, next);
		await flushPromises();

		expect(next).toHaveBeenCalledWith();
		expect(response.locals.connectInstallation).toBe(connectInstallation);
		expect(jiraServerSymmetricJwtTokenVerifier.verify).toHaveBeenCalledWith(
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
			.spyOn(jiraServerSymmetricJwtTokenVerifier, 'verify')
			.mockRejectedValue(error);

		jiraServerSymmetricJwtAuthMiddleware(request, {} as Response, next);
		await flushPromises();

		expect(next).toHaveBeenCalledWith(
			new UnauthorizedResponseStatusError('Unauthorized.', undefined, error),
		);
	});

	it('should not authenticate request with no token', async () => {
		const request = {
			headers: {},
		} as Request;
		const next = jest.fn();

		jiraServerSymmetricJwtAuthMiddleware(request, {} as Response, next);
		await flushPromises();

		expect(next).toHaveBeenCalledWith(
			new UnauthorizedResponseStatusError('Missing JWT token.'),
		);
	});
});
