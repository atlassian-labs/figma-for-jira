import { v4 as uuidv4 } from 'uuid';

import {
	figmaAuthService,
	MissingOrInvalidCredentialsFigmaAuthServiceError,
} from './figma-auth-service';
import type {
	CreateDevResourcesResponse,
	CreateWebhookResponse,
	GetDevResourcesResponse,
} from './figma-client';
import { figmaClient } from './figma-client';
import {
	generateChildNode,
	generateFrameNode,
	generateGetDevResourcesResponse,
	generateGetFileMetaResponse,
	generateGetFileResponse,
	generateGetFileResponseWithNode,
	generateGetFileResponseWithNodes,
} from './figma-client/testing';
import {
	figmaService,
	InvalidInputFigmaServiceError,
	PaidPlanRequiredFigmaServiceError,
} from './figma-service';
import {
	transformFileMetaToAtlassianDesign,
	transformFileToAtlassianDesign,
	tryTransformNodeToAtlassianDesign,
} from './transformers';

import { getConfig } from '../../config';
import {
	generateConnectUserInfo,
	generateFigmaDesignIdentifier,
	generateFigmaFileKey,
	generateFigmaNodeId,
	generateFigmaOAuth2UserCredentials,
	generateJiraIssueKey,
	generateJiraIssueUrl,
} from '../../domain/entities/testing';
import {
	BadRequestHttpClientError,
	ForbiddenHttpClientError,
	HttpClientError,
	NotFoundHttpClientError,
	UnauthorizedHttpClientError,
} from '../http-client-errors';

describe('FigmaService', () => {
	const MOCK_CONNECT_USER_INFO = generateConnectUserInfo();
	const MOCK_CREDENTIALS = generateFigmaOAuth2UserCredentials({
		atlassianUserId: MOCK_CONNECT_USER_INFO.atlassianUserId,
		connectInstallationId: MOCK_CONNECT_USER_INFO.connectInstallationId,
	});

	describe('getCurrentUser', () => {
		it('should return if the user is authorized', async () => {
			const credentials = generateFigmaOAuth2UserCredentials();
			jest
				.spyOn(figmaAuthService, 'getCredentials')
				.mockResolvedValue(credentials);
			jest
				.spyOn(figmaClient, 'me')
				.mockResolvedValue({ email: 'me@foo.com', id: '1234' });

			const result = await figmaService.getCurrentUser(MOCK_CONNECT_USER_INFO);

			expect(result).toEqual({ id: '1234', email: 'me@foo.com' });
			expect(figmaAuthService.getCredentials).toHaveBeenCalledWith(
				MOCK_CONNECT_USER_INFO,
			);
			expect(figmaClient.me).toHaveBeenCalledWith(credentials.accessToken);
		});

		it('should return null if there are no valid credentials', async () => {
			jest
				.spyOn(figmaAuthService, 'getCredentials')
				.mockRejectedValue(
					new MissingOrInvalidCredentialsFigmaAuthServiceError(),
				);

			const result = await figmaService.getCurrentUser(MOCK_CONNECT_USER_INFO);

			expect(result).toBe(null);
		});

		it('should return null if user is not authorized to call Figma API', async () => {
			jest
				.spyOn(figmaAuthService, 'getCredentials')
				.mockResolvedValue(generateFigmaOAuth2UserCredentials());
			jest
				.spyOn(figmaClient, 'me')
				.mockRejectedValue(new ForbiddenHttpClientError());

			const result = await figmaService.getCurrentUser(MOCK_CONNECT_USER_INFO);

			expect(result).toBe(null);
		});

		it('should throw if request Figma API fails with no auth-related error', async () => {
			const error = new Error();
			const credentials = generateFigmaOAuth2UserCredentials();
			jest
				.spyOn(figmaAuthService, 'getCredentials')
				.mockResolvedValue(credentials);
			jest.spyOn(figmaClient, 'me').mockRejectedValue(error);

			await expect(
				figmaService.getCurrentUser(MOCK_CONNECT_USER_INFO),
			).rejects.toStrictEqual(error);
		});
	});

	describe('getDesign', () => {
		it('should return design if design id points out to Figma file', async () => {
			const designId = generateFigmaDesignIdentifier();
			const credentials = generateFigmaOAuth2UserCredentials();
			const fileMetaResponse = generateGetFileMetaResponse();

			jest
				.spyOn(figmaAuthService, 'getCredentials')
				.mockResolvedValue(credentials);
			jest
				.spyOn(figmaClient, 'getFileMeta')
				.mockResolvedValue(fileMetaResponse);

			const res = await figmaService.getDesign(
				designId,
				MOCK_CONNECT_USER_INFO,
			);

			const expectedEntity = transformFileMetaToAtlassianDesign({
				fileKey: designId.fileKey,
				fileMetaResponse,
			});
			expect(res).toStrictEqual({
				...expectedEntity,
				lastUpdated: expect.anything(),
			});
		});

		it('should return design if design id points out to Figma node', async () => {
			const nodeId = generateFigmaNodeId();
			const node = generateChildNode({ id: nodeId });
			const designId = generateFigmaDesignIdentifier({ nodeId });
			const credentials = generateFigmaOAuth2UserCredentials();
			const fileResponse = generateGetFileResponseWithNode({ node });
			const fileMetaResponse = generateGetFileMetaResponse();
			jest
				.spyOn(figmaAuthService, 'getCredentials')
				.mockResolvedValue(credentials);
			jest.spyOn(figmaClient, 'getFile').mockResolvedValue(fileResponse);
			jest
				.spyOn(figmaClient, 'getFileMeta')
				.mockResolvedValue(fileMetaResponse);
			const result = await figmaService.getDesign(
				designId,
				MOCK_CONNECT_USER_INFO,
			);

			const expectedEntity = tryTransformNodeToAtlassianDesign({
				fileKey: designId.fileKey,
				nodeId: designId.nodeId!,
				fileResponse,
				fileMetaResponse,
			});
			expect(result).toStrictEqual({
				...expectedEntity,
				lastUpdated: expect.anything(),
				lastUpdatedBy: { id: fileMetaResponse.file.last_touched_by!.id },
			});
		});

		it('should return `null` when Figma node is not found', async () => {
			const designId = generateFigmaDesignIdentifier({
				nodeId: generateFigmaNodeId(),
			});
			const credentials = generateFigmaOAuth2UserCredentials();

			jest
				.spyOn(figmaAuthService, 'getCredentials')
				.mockResolvedValue(credentials);
			jest
				.spyOn(figmaClient, 'getFile')
				.mockRejectedValue(new NotFoundHttpClientError());

			const result = await figmaService.getDesign(
				designId,
				MOCK_CONNECT_USER_INFO,
			);

			expect(result).toBeNull();
		});

		it('should throw when a request to a Figma api fails', async () => {
			const designId = generateFigmaDesignIdentifier();
			const credentials = generateFigmaOAuth2UserCredentials();
			const error = new HttpClientError('Figma API failed');

			jest
				.spyOn(figmaAuthService, 'getCredentials')
				.mockResolvedValue(credentials);
			jest.spyOn(figmaClient, 'getFileMeta').mockRejectedValue(error);

			await expect(
				figmaService.getDesign(designId, MOCK_CONNECT_USER_INFO),
			).rejects.toStrictEqual(error);
		});
	});

	describe('getDesignOrParent', () => {
		it('should return a valid design entity if design id points out to Figma file', async () => {
			const designId = generateFigmaDesignIdentifier();
			const credentials = generateFigmaOAuth2UserCredentials();
			const fileMetaResponse = generateGetFileMetaResponse();

			jest
				.spyOn(figmaAuthService, 'getCredentials')
				.mockResolvedValue(credentials);
			jest
				.spyOn(figmaClient, 'getFileMeta')
				.mockResolvedValue(fileMetaResponse);

			const result = await figmaService.getDesignOrParent(
				designId,
				MOCK_CONNECT_USER_INFO,
			);

			const expectedEntity = transformFileMetaToAtlassianDesign({
				fileKey: designId.fileKey,
				fileMetaResponse,
			});
			expect(result).toStrictEqual({
				...expectedEntity,
				lastUpdated: expect.anything(),
			});
		});

		it('should return a valid design entity if design id points out to Figma node', async () => {
			const nodeId = generateFigmaNodeId();
			const node = generateChildNode({ id: nodeId });
			const designId = generateFigmaDesignIdentifier({ nodeId });
			const credentials = generateFigmaOAuth2UserCredentials();
			const fileResponse = generateGetFileResponseWithNode({ node });
			const fileMetaResponse = generateGetFileMetaResponse();
			jest
				.spyOn(figmaAuthService, 'getCredentials')
				.mockResolvedValue(credentials);
			jest.spyOn(figmaClient, 'getFile').mockResolvedValue(fileResponse);
			jest
				.spyOn(figmaClient, 'getFileMeta')
				.mockResolvedValue(fileMetaResponse);

			const result = await figmaService.getDesignOrParent(
				designId,
				MOCK_CONNECT_USER_INFO,
			);

			const expectedEntity = tryTransformNodeToAtlassianDesign({
				fileKey: designId.fileKey,
				nodeId: designId.nodeId!,
				fileResponse,
				fileMetaResponse,
			});
			expect(result).toStrictEqual({
				...expectedEntity,
				lastUpdated: expect.anything(),
				lastUpdatedBy: { id: fileMetaResponse.file.last_touched_by!.id },
			});
		});

		it('should return design for Figma file when Figma node is not found', async () => {
			const designId = generateFigmaDesignIdentifier({
				nodeId: generateFigmaNodeId(),
			});
			const credentials = generateFigmaOAuth2UserCredentials();
			const fileResponse = generateGetFileResponse();
			const fileMetaResponse = generateGetFileMetaResponse();

			jest
				.spyOn(figmaAuthService, 'getCredentials')
				.mockResolvedValue(credentials);
			jest.spyOn(figmaClient, 'getFile').mockResolvedValue(fileResponse);
			jest
				.spyOn(figmaClient, 'getFileMeta')
				.mockResolvedValue(fileMetaResponse);

			const result = await figmaService.getDesignOrParent(
				designId,
				MOCK_CONNECT_USER_INFO,
			);

			const expectedEntity = transformFileToAtlassianDesign({
				fileKey: designId.fileKey,
				fileResponse,
				fileMetaResponse,
			});
			expect(result).toStrictEqual({
				...expectedEntity,
				lastUpdated: expect.anything(),
			});
		});

		it('should return `null` when Figma file is not found', async () => {
			const designId = generateFigmaDesignIdentifier({
				nodeId: generateFigmaNodeId(),
			});
			const credentials = generateFigmaOAuth2UserCredentials();

			jest
				.spyOn(figmaAuthService, 'getCredentials')
				.mockResolvedValue(credentials);
			jest
				.spyOn(figmaClient, 'getFile')
				.mockRejectedValue(new NotFoundHttpClientError());

			const design = await figmaService.getDesignOrParent(
				designId,
				MOCK_CONNECT_USER_INFO,
			);

			expect(design).toBeNull();
		});

		it('should throw when a request to a Figma api fails', async () => {
			const designId = generateFigmaDesignIdentifier();
			const credentials = generateFigmaOAuth2UserCredentials();
			const error = new HttpClientError('Figma API failed');

			jest
				.spyOn(figmaAuthService, 'getCredentials')
				.mockResolvedValue(credentials);
			jest.spyOn(figmaClient, 'getFileMeta').mockRejectedValue(error);

			await expect(
				figmaService.getDesignOrParent(designId, MOCK_CONNECT_USER_INFO),
			).rejects.toStrictEqual(error);
		});
	});

	describe('getAvailableDesignsFromSameFile', () => {
		it('should return designs for Figma file', async () => {
			const fileKey = generateFigmaFileKey();
			const designIdWithoutNode = generateFigmaDesignIdentifier({ fileKey });
			const credentials = generateFigmaOAuth2UserCredentials();
			const mockResponse = generateGetFileResponse();
			const mockFileMetaResponse = generateGetFileMetaResponse();

			jest
				.spyOn(figmaAuthService, 'getCredentials')
				.mockResolvedValue(credentials);
			jest.spyOn(figmaClient, 'getFile').mockResolvedValue(mockResponse);
			jest
				.spyOn(figmaClient, 'getFileMeta')
				.mockResolvedValue(mockFileMetaResponse);

			const result = await figmaService.getAvailableDesignsFromSameFile(
				[designIdWithoutNode],
				MOCK_CONNECT_USER_INFO,
			);

			expect(result).toStrictEqual([
				transformFileToAtlassianDesign({
					fileKey: designIdWithoutNode.fileKey,
					fileResponse: mockResponse,
					fileMetaResponse: mockFileMetaResponse,
				}),
			]);
			expect(figmaClient.getFile).toHaveBeenCalledWith(
				fileKey,
				{
					ids: [],
					depth: 1,
					node_last_modified: true,
				},
				credentials.accessToken,
			);
		});

		it('should return designs for Figma file and nodes', async () => {
			const node1 = generateFrameNode({ id: '1:1' });
			const node2 = generateFrameNode({ id: '1:2' });
			const fileKey = generateFigmaFileKey();
			const designIdWithoutNode = generateFigmaDesignIdentifier({ fileKey });
			const designIdWithNode1 = generateFigmaDesignIdentifier({
				fileKey,
				nodeId: node1.id,
			});
			const designIdWithNode2 = generateFigmaDesignIdentifier({
				fileKey,
				nodeId: node2.id,
			});
			const credentials = generateFigmaOAuth2UserCredentials();
			const mockResponse = generateGetFileResponseWithNodes({
				nodes: [node1, node2],
			});
			const mockFileMetaResponse = generateGetFileMetaResponse();

			jest
				.spyOn(figmaAuthService, 'getCredentials')
				.mockResolvedValue(credentials);
			jest.spyOn(figmaClient, 'getFile').mockResolvedValue(mockResponse);
			jest
				.spyOn(figmaClient, 'getFileMeta')
				.mockResolvedValue(mockFileMetaResponse);

			const result = await figmaService.getAvailableDesignsFromSameFile(
				[designIdWithoutNode, designIdWithNode1, designIdWithNode2],
				MOCK_CONNECT_USER_INFO,
			);

			expect(result).toStrictEqual([
				transformFileToAtlassianDesign({
					fileKey: designIdWithoutNode.fileKey,
					fileResponse: mockResponse,
					fileMetaResponse: mockFileMetaResponse,
				}),
				tryTransformNodeToAtlassianDesign({
					fileKey: designIdWithNode1.fileKey,
					nodeId: designIdWithNode1.nodeId!,
					fileResponse: mockResponse,
					fileMetaResponse: mockFileMetaResponse,
				}),
				tryTransformNodeToAtlassianDesign({
					fileKey: designIdWithNode2.fileKey,
					nodeId: designIdWithNode2.nodeId!,
					fileResponse: mockResponse,
					fileMetaResponse: mockFileMetaResponse,
				}),
			]);
			expect(figmaClient.getFile).toHaveBeenCalledWith(
				fileKey,
				{
					ids: [designIdWithNode1.nodeId, designIdWithNode2.nodeId],
					depth: 0,
					node_last_modified: true,
				},
				credentials.accessToken,
			);
		});

		it('should return empty array if Figma file does not exist', async () => {
			const designId = generateFigmaDesignIdentifier();
			const credentials = generateFigmaOAuth2UserCredentials();
			const error = new NotFoundHttpClientError('Figma API failed');

			jest
				.spyOn(figmaAuthService, 'getCredentials')
				.mockResolvedValue(credentials);
			jest.spyOn(figmaClient, 'getFile').mockRejectedValue(error);

			const result = await figmaService.getAvailableDesignsFromSameFile(
				[designId],
				MOCK_CONNECT_USER_INFO,
			);

			expect(result).toEqual([]);
		});

		it('should return designs excluding designs for non-existent Figma nodes', async () => {
			const node1 = generateFrameNode({ id: '1:1' });
			const node2 = generateFrameNode({ id: '1:2' });
			const fileKey = generateFigmaFileKey();
			const designIdWithoutNode = generateFigmaDesignIdentifier({ fileKey });
			const designIdWithNode1 = generateFigmaDesignIdentifier({
				fileKey,
				nodeId: node1.id,
			});
			const designIdWithNode2 = generateFigmaDesignIdentifier({
				fileKey,
				nodeId: node2.id,
			});
			const credentials = generateFigmaOAuth2UserCredentials();
			const mockResponse = generateGetFileResponseWithNodes({
				nodes: [node1],
			});
			const mockFileMetaResponse = generateGetFileMetaResponse();

			jest
				.spyOn(figmaAuthService, 'getCredentials')
				.mockResolvedValue(credentials);
			jest.spyOn(figmaClient, 'getFile').mockResolvedValue(mockResponse);
			jest
				.spyOn(figmaClient, 'getFileMeta')
				.mockResolvedValue(mockFileMetaResponse);

			const result = await figmaService.getAvailableDesignsFromSameFile(
				[designIdWithoutNode, designIdWithNode1, designIdWithNode2],
				MOCK_CONNECT_USER_INFO,
			);

			expect(result).toStrictEqual([
				transformFileToAtlassianDesign({
					fileKey: designIdWithoutNode.fileKey,
					fileResponse: mockResponse,
					fileMetaResponse: mockFileMetaResponse,
				}),
				tryTransformNodeToAtlassianDesign({
					fileKey: designIdWithNode1.fileKey,
					nodeId: designIdWithNode1.nodeId!,
					fileResponse: mockResponse,
					fileMetaResponse: mockFileMetaResponse,
				}),
			]);
		});

		it('should immediately return an empty array if passed an empty design ids array', async () => {
			jest.spyOn(figmaAuthService, 'getCredentials');

			const result = await figmaService.getAvailableDesignsFromSameFile(
				[],
				MOCK_CONNECT_USER_INFO,
			);

			expect(result).toStrictEqual([]);
			expect(figmaAuthService.getCredentials).not.toHaveBeenCalled();
		});

		it('should throw a FigmaServiceError if design ids have different file keys', async () => {
			const designIds = [
				generateFigmaDesignIdentifier(),
				generateFigmaDesignIdentifier(),
				generateFigmaDesignIdentifier(),
			];
			jest.spyOn(figmaAuthService, 'getCredentials');

			await expect(
				figmaService.getAvailableDesignsFromSameFile(
					designIds,
					MOCK_CONNECT_USER_INFO,
				),
			).rejects.toThrow();
			expect(figmaAuthService.getCredentials).not.toHaveBeenCalled();
		});
	});

	describe('tryCreateDevResourceForJiraIssue', () => {
		const MOCK_CREDENTIALS = generateFigmaOAuth2UserCredentials();
		beforeEach(() => {
			jest
				.spyOn(figmaAuthService, 'getCredentials')
				.mockResolvedValue(MOCK_CREDENTIALS);
		});

		it('should call figmaClient to create a dev_resource when design points out to file', async () => {
			const issueKey = generateJiraIssueKey();
			const issueUrl = generateJiraIssueUrl();
			const issueTitle = uuidv4();
			const designId = generateFigmaDesignIdentifier();
			jest.spyOn(figmaClient, 'createDevResources').mockResolvedValue({
				errors: [],
			} as CreateDevResourcesResponse);

			await figmaService.tryCreateDevResourceForJiraIssue({
				designId,
				issue: {
					url: issueUrl,
					key: issueKey,
					title: issueTitle,
				},
				user: MOCK_CONNECT_USER_INFO,
			});

			expect(figmaClient.createDevResources).toHaveBeenCalledWith(
				{
					dev_resources: [
						{
							name: `[${issueKey}] ${issueTitle}`,
							url: issueUrl,
							file_key: designId.fileKey,
							node_id: '0:0',
						},
					],
				},
				MOCK_CREDENTIALS.accessToken,
			);
		});

		it('should call figmaClient to create a dev_resource when design points out to node', async () => {
			const issueKey = generateJiraIssueKey();
			const issueUrl = generateJiraIssueUrl();
			const issueTitle = uuidv4();
			const nodeId = generateFigmaNodeId();
			const designId = generateFigmaDesignIdentifier({ nodeId });
			jest.spyOn(figmaClient, 'createDevResources').mockResolvedValue({
				errors: [],
			} as CreateDevResourcesResponse);

			await figmaService.tryCreateDevResourceForJiraIssue({
				designId,
				issue: {
					url: issueUrl,
					key: issueKey,
					title: issueTitle,
				},
				user: MOCK_CONNECT_USER_INFO,
			});

			expect(figmaClient.createDevResources).toHaveBeenCalledWith(
				{
					dev_resources: [
						{
							name: `[${issueKey}] ${issueTitle}`,
							url: issueUrl,
							file_key: designId.fileKey,
							node_id: designId.nodeId!,
						},
					],
				},
				MOCK_CREDENTIALS.accessToken,
			);
		});

		it('should throw when dev_resource creation fails', async () => {
			const issueKey = generateJiraIssueKey();
			const issueUrl = generateJiraIssueUrl();
			const issueTitle = uuidv4();
			const designId = generateFigmaDesignIdentifier();
			const expectedError = new Error('Dev resource create failed');
			jest
				.spyOn(figmaClient, 'createDevResources')
				.mockRejectedValue(expectedError);

			await expect(() =>
				figmaService.tryCreateDevResourceForJiraIssue({
					designId,
					issue: {
						url: issueUrl,
						key: issueKey,
						title: issueTitle,
					},
					user: MOCK_CONNECT_USER_INFO,
				}),
			).rejects.toThrow(expectedError);
		});
	});

	describe('tryDeleteDevResource', () => {
		const MOCK_CREDENTIALS = generateFigmaOAuth2UserCredentials();
		beforeEach(() => {
			jest
				.spyOn(figmaAuthService, 'getCredentials')
				.mockResolvedValue(MOCK_CREDENTIALS);
		});

		it('should delete dev resource for a file', async () => {
			const designId = generateFigmaDesignIdentifier();
			const devResourceUrl = generateJiraIssueUrl();
			const getDevResourcesResponse = generateGetDevResourcesResponse({
				url: devResourceUrl,
			});
			jest
				.spyOn(figmaClient, 'getDevResources')
				.mockResolvedValue(getDevResourcesResponse);
			jest.spyOn(figmaClient, 'deleteDevResource').mockResolvedValue();

			await figmaService.tryDeleteDevResource({
				designId,
				devResourceUrl,
				user: MOCK_CONNECT_USER_INFO,
			});

			expect(figmaAuthService.getCredentials).toHaveBeenCalledWith(
				MOCK_CONNECT_USER_INFO,
			);
			expect(figmaClient.getDevResources).toHaveBeenCalledWith({
				fileKey: designId.fileKey,
				nodeIds: ['0:0'],
				accessToken: MOCK_CREDENTIALS.accessToken,
			});
			expect(figmaClient.deleteDevResource).toHaveBeenCalledWith({
				fileKey: designId.fileKey,
				devResourceId: getDevResourcesResponse.dev_resources[0].id,
				accessToken: MOCK_CREDENTIALS.accessToken,
			});
		});

		it('should delete dev resource for a node', async () => {
			const designId = generateFigmaDesignIdentifier({
				nodeId: generateFigmaNodeId(),
			});
			const devResourceUrl = generateJiraIssueUrl();
			const getDevResourcesResponse = generateGetDevResourcesResponse({
				url: devResourceUrl,
			});
			jest
				.spyOn(figmaClient, 'getDevResources')
				.mockResolvedValue(getDevResourcesResponse);
			jest.spyOn(figmaClient, 'deleteDevResource').mockResolvedValue();

			await figmaService.tryDeleteDevResource({
				designId,
				devResourceUrl,
				user: MOCK_CONNECT_USER_INFO,
			});

			expect(figmaAuthService.getCredentials).toHaveBeenCalledWith(
				MOCK_CONNECT_USER_INFO,
			);
			expect(figmaClient.getDevResources).toHaveBeenCalledWith({
				fileKey: designId.fileKey,
				nodeIds: [designId.nodeId],
				accessToken: MOCK_CREDENTIALS.accessToken,
			});
			expect(figmaClient.deleteDevResource).toHaveBeenCalledWith({
				fileKey: designId.fileKey,
				devResourceId: getDevResourcesResponse.dev_resources[0].id,
				accessToken: MOCK_CREDENTIALS.accessToken,
			});
		});

		it('should not attempt to delete if dev resource with given URL does not exist', async () => {
			const designId = generateFigmaDesignIdentifier({
				nodeId: generateFigmaNodeId(),
			});
			const devResourceUrl = generateJiraIssueUrl();
			const getDevResourcesResponse: GetDevResourcesResponse = {
				dev_resources: [],
			};
			jest
				.spyOn(figmaClient, 'getDevResources')
				.mockResolvedValue(getDevResourcesResponse);
			jest.spyOn(figmaClient, 'deleteDevResource').mockResolvedValue();

			await figmaService.tryDeleteDevResource({
				designId,
				devResourceUrl,
				user: MOCK_CONNECT_USER_INFO,
			});

			expect(figmaClient.deleteDevResource).not.toHaveBeenCalled();
		});

		it.each([
			new UnauthorizedHttpClientError(),
			new ForbiddenHttpClientError(),
			new NotFoundHttpClientError(),
		])(
			'should not throw if dev resource deletion fails with %s',
			async (error: Error) => {
				const designId = generateFigmaDesignIdentifier({
					nodeId: generateFigmaNodeId(),
				});
				const devResourceUrl = generateJiraIssueUrl();
				const getDevResourcesResponse = generateGetDevResourcesResponse({
					url: devResourceUrl,
				});
				jest
					.spyOn(figmaClient, 'getDevResources')
					.mockResolvedValue(getDevResourcesResponse);
				jest.spyOn(figmaClient, 'deleteDevResource').mockRejectedValue(error);

				await expect(
					figmaService.tryDeleteDevResource({
						designId,
						devResourceUrl,
						user: MOCK_CONNECT_USER_INFO,
					}),
				).resolves.toBeUndefined();
			},
		);

		it('should throw if dev resource deletion fails with unexpected error', async () => {
			const designId = generateFigmaDesignIdentifier({
				nodeId: generateFigmaNodeId(),
			});
			const devResourceUrl = generateJiraIssueUrl();
			const getDevResourcesResponse = generateGetDevResourcesResponse({
				url: devResourceUrl,
			});
			const error = new Error();
			jest
				.spyOn(figmaClient, 'getDevResources')
				.mockResolvedValue(getDevResourcesResponse);
			jest.spyOn(figmaClient, 'deleteDevResource').mockRejectedValue(error);

			await expect(() =>
				figmaService.tryDeleteDevResource({
					designId,
					devResourceUrl,
					user: MOCK_CONNECT_USER_INFO,
				}),
			).rejects.toThrow(error);
		});
	});

	describe('createFileUpdateWebhook', () => {
		beforeEach(() => {
			jest
				.spyOn(figmaAuthService, 'getCredentials')
				.mockResolvedValue(MOCK_CREDENTIALS);
		});

		it('should call figmaClient to create a webhook', async () => {
			const webhookId = uuidv4();
			const teamId = uuidv4();
			const endpoint = `${getConfig().app.baseUrl}/figma/webhook`;
			const passcode = uuidv4();
			const description = 'Figma for Jira Cloud';

			jest.spyOn(figmaClient, 'createWebhook').mockResolvedValue({
				id: webhookId,
				team_id: teamId,
				event_type: 'FILE_UPDATE',
				client_id: 'test-client',
				endpoint,
				passcode,
				status: 'ACTIVE',
				description,
				protocol_version: '2',
			} as CreateWebhookResponse);

			await figmaService.createFileUpdateWebhook(
				teamId,
				passcode,
				MOCK_CONNECT_USER_INFO,
			);

			expect(figmaClient.createWebhook).toHaveBeenCalledWith(
				{
					event_type: 'FILE_UPDATE',
					team_id: teamId,
					endpoint,
					passcode,
					description,
				},
				MOCK_CREDENTIALS.accessToken,
			);
		});

		it('should throw `PaidPlanRequiredFigmaServiceError` when Figma returns HTTP 400 with "Access Denied" message', async () => {
			const teamId = uuidv4();
			const connectInstallationSecret = uuidv4();

			jest.spyOn(figmaClient, 'createWebhook').mockRejectedValue(
				new BadRequestHttpClientError('Failed', {
					message: 'Access Denied',
				}),
			);

			await expect(() =>
				figmaService.createFileUpdateWebhook(
					teamId,
					connectInstallationSecret,
					MOCK_CONNECT_USER_INFO,
				),
			).rejects.toThrow(PaidPlanRequiredFigmaServiceError);
		});

		it('should rethrow when Figma returns HTTP 400 with no "Access Denied" message', async () => {
			const teamId = uuidv4();
			const connectInstallationSecret = uuidv4();
			const error = new BadRequestHttpClientError('Failed', {
				message: 'Bad request',
			});

			jest.spyOn(figmaClient, 'createWebhook').mockRejectedValue(error);

			await expect(() =>
				figmaService.createFileUpdateWebhook(
					teamId,
					connectInstallationSecret,
					MOCK_CONNECT_USER_INFO,
				),
			).rejects.toThrow(error);
		});

		it('should rethrow when webhook creation fails with unexpected error', async () => {
			const teamId = uuidv4();
			const connectInstallationSecret = uuidv4();
			const expectedError = new Error('Webhook create failed');
			jest.spyOn(figmaClient, 'createWebhook').mockRejectedValue(expectedError);

			await expect(() =>
				figmaService.createFileUpdateWebhook(
					teamId,
					connectInstallationSecret,
					MOCK_CONNECT_USER_INFO,
				),
			).rejects.toThrow(expectedError);
		});
	});

	describe('tryDeleteWebhook', () => {
		beforeEach(() => {
			jest
				.spyOn(figmaAuthService, 'getCredentials')
				.mockResolvedValue(MOCK_CREDENTIALS);
		});

		it('should call figmaClient to delete a webhook', async () => {
			const webhookId = uuidv4();
			jest.spyOn(figmaClient, 'deleteWebhook').mockResolvedValue();

			await figmaService.tryDeleteWebhook(webhookId, MOCK_CONNECT_USER_INFO);

			expect(figmaClient.deleteWebhook).toHaveBeenCalledWith(
				webhookId,
				MOCK_CREDENTIALS.accessToken,
			);
		});

		it('should not throw when a webhook is not found', async () => {
			const webhookId = uuidv4();
			jest
				.spyOn(figmaClient, 'deleteWebhook')
				.mockRejectedValue(new NotFoundHttpClientError());

			await expect(
				figmaService.tryDeleteWebhook(webhookId, MOCK_CONNECT_USER_INFO),
			).resolves.toBeUndefined();
		});

		it('should throw when deletion fails', async () => {
			const webhookId = uuidv4();
			jest.spyOn(figmaClient, 'deleteWebhook').mockRejectedValue(new Error());

			await expect(
				figmaService.tryDeleteWebhook(webhookId, MOCK_CONNECT_USER_INFO),
			).rejects.toThrowError();
		});
	});

	describe('getTeamName', () => {
		beforeEach(() => {
			jest
				.spyOn(figmaAuthService, 'getCredentials')
				.mockResolvedValue(MOCK_CREDENTIALS);
		});

		it('should call figmaClient to get team name', async () => {
			const teamId = uuidv4();
			const teamName = uuidv4();

			jest
				.spyOn(figmaClient, 'getTeamProjects')
				.mockResolvedValue({ name: teamName, projects: [] });

			const result = await figmaService.getTeamName(
				teamId,
				MOCK_CONNECT_USER_INFO,
			);
			expect(result).toStrictEqual(teamName);
		});

		it('should throw an invalid request error when the team id is invalid', async () => {
			const teamId = uuidv4();

			jest.spyOn(figmaClient, 'getTeamProjects').mockRejectedValue(
				new BadRequestHttpClientError('Failed', {
					message: 'No such team',
				}),
			);

			await expect(
				figmaService.getTeamName(teamId, MOCK_CONNECT_USER_INFO),
			).rejects.toThrow(InvalidInputFigmaServiceError);
		});

		it('should throw an error when the request fails', async () => {
			const teamId = uuidv4();

			jest
				.spyOn(figmaClient, 'getTeamProjects')
				.mockRejectedValue(new NotFoundHttpClientError());

			await expect(
				figmaService.getTeamName(teamId, MOCK_CONNECT_USER_INFO),
			).rejects.toThrow();
		});
	});
});
