import { AxiosError } from 'axios';

import {
	figmaAuthService,
	NoFigmaCredentialsError,
	RefreshFigmaCredentialsError,
} from './figma-auth-service';
import { figmaClient } from './figma-client';

import { HttpStatus } from '../../common/http-status';

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
}

export const figmaService = new FigmaService();
