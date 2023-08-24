import axios from 'axios';

import { HttpStatus } from '../../common/http-status';
import { figmaClient } from './figma-client';
import { figmaAuthService } from './figma-auth-service';

export class FigmaService {
	validateAuth = async (atlassianUserId: string): Promise<boolean> => {
		try {
			const credentials =
				await figmaAuthService.getCredentials(atlassianUserId);

			if (!credentials) return false;

			await figmaClient.me(credentials.accessToken);

			return true;
		} catch (e: unknown) {
			if (axios.isAxiosError(e) && e.status == HttpStatus.FORBIDDEN)
				return false;

			throw e;
		}
	};
}

export const figmaService = new FigmaService();
