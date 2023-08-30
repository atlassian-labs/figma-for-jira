import { AxiosError } from 'axios';

import {
	figmaAuthService,
	NoFigmaCredentialsError,
	RefreshFigmaCredentialsError,
} from './figma-auth-service';
import { figmaClient } from './figma-client';
import {
	extractDataFromFigmaUrl,
	transformFileToDataDepotDesign,
	transformNodeToDataDepotDesign,
} from './figma-transformer';

import { HttpStatus } from '../../common/http-status';
import { DataDepotDesign } from '../../domain/entities/design';
import { AssociateWith } from '../../web/routes/entities';
import { getLogger } from '../logger';

export class FigmaService {
	validateAuth = async (atlassianUserId: string): Promise<boolean> => {
		try {
			const credentials =
				await figmaAuthService.getCredentials(atlassianUserId);
			await figmaClient.me(credentials.accessToken);

			return true;
		} catch (e: unknown) {
			if (
				e instanceof NoFigmaCredentialsError ||
				e instanceof RefreshFigmaCredentialsError
			)
				return false;

			const forbidden =
				e instanceof AxiosError && e?.response?.status == HttpStatus.FORBIDDEN;

			if (forbidden) return false;

			throw e;
		}
	};

	fetchDesign = async (
		url: string,
		atlassianUserId: string,
		associateWith: AssociateWith,
	): Promise<DataDepotDesign> => {
		const urlData = extractDataFromFigmaUrl(url);
		if (!urlData) {
			const errorMessage = `Received invalid Figma URL: ${url}`;
			getLogger().error(errorMessage);
			throw new Error(errorMessage);
		}

		// TODO: Validate associateWith ARI shape

		const hasValidAuth = await this.validateAuth(atlassianUserId);
		if (!hasValidAuth) {
			throw new Error('Invalid auth');
		}

		const { accessToken } =
			await figmaAuthService.getCredentials(atlassianUserId);

		const { fileKey, nodeId, isPrototype } = urlData;

		if (nodeId) {
			const fileNodesResponse = await figmaClient.getFileNodes(
				fileKey,
				nodeId,
				accessToken,
			);
			return transformNodeToDataDepotDesign({
				nodeId,
				url,
				isPrototype,
				associateWith,
				fileNodesResponse,
			});
		} else {
			const fileResponse = await figmaClient.getFile(fileKey, accessToken);
			return transformFileToDataDepotDesign({
				url,
				isPrototype,
				associateWith,
				fileResponse,
			});
		}
	};
}

export const figmaService = new FigmaService();
