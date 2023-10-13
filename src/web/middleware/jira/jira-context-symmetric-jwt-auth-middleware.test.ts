import type { Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';

import { jiraContextSymmetricJwtAuthMiddleware } from './jira-context-symmetric-jwt-auth-middleware';

import { flushPromises } from '../../../common/testing/utils';
import { generateConnectInstallation } from '../../../domain/entities/testing';
import { jiraContextSymmetricJwtTokenVerifier } from '../../../infrastructure/jira/inbound-auth';
import { UnauthorizedError } from '../errors';

describe('jiraContextSymmetricJwtAuthMiddleware', () => {
	it('should authenticate request with valid token ', async () => {
		const connectInstallation = generateConnectInstallation();
		const atlassianUserId = uuidv4();
		const token = uuidv4();
		const request = {
			headers: {
				authorization: `JWT ${token}`,
			},
		} as Request;
		const response = { locals: {} } as Response;
		const next = jest.fn();
		jest
			.spyOn(jiraContextSymmetricJwtTokenVerifier, 'verify')
			.mockResolvedValue({
				connectInstallation,
				atlassianUserId,
			});

		jiraContextSymmetricJwtAuthMiddleware(request, response, next);
		await flushPromises();

		expect(next).toHaveBeenCalledWith();
		expect(response.locals.connectInstallation).toBe(connectInstallation);
		expect(response.locals.atlassianUserId).toBe(atlassianUserId);
		expect(jiraContextSymmetricJwtTokenVerifier.verify).toHaveBeenCalledWith(
			token,
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
		const error = new UnauthorizedError();
		jest
			.spyOn(jiraContextSymmetricJwtTokenVerifier, 'verify')
			.mockRejectedValue(error);

		jiraContextSymmetricJwtAuthMiddleware(request, {} as Response, next);
		await flushPromises();

		expect(next).toHaveBeenCalledWith(error);
	});

	it('should not authenticate request with no token', async () => {
		const request = {
			headers: {},
		} as Request;
		const next = jest.fn();

		jiraContextSymmetricJwtAuthMiddleware(request, {} as Response, next);
		await flushPromises();

		expect(next).toHaveBeenCalledWith(
			new UnauthorizedError('Missing JWT token.'),
		);
	});
});
