import type { ConnectUserInfo } from '../domain/entities';
import { figmaAuthService } from '../infrastructure/figma';

export const addFigmaOAuthCredentialsUseCase = {
	execute: async (code: string, user: ConnectUserInfo) => {
		await figmaAuthService.createCredentials(code, user);
	},
};
