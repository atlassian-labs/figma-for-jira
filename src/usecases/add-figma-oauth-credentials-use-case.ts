import { figmaAuthService } from '../infrastructure/figma';
import { ConnectUserInfo } from '../domain/entities';

export const addFigmaOAuthCredentialsUseCase = {
	execute: async (code: string, user: ConnectUserInfo) => {
		await figmaAuthService.createCredentials(code, user);
	},
};
