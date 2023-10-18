import type { ConnectInstallation, FigmaTeamSummary } from '../domain/entities';
import { figmaTeamRepository } from '../infrastructure/repositories';

export const listFigmaTeamsUseCase = {
	execute: async (
		connectInstallation: ConnectInstallation,
	): Promise<FigmaTeamSummary[]> => {
		return figmaTeamRepository.findManySummaryByConnectInstallationId(
			connectInstallation.id,
		);
	},
};
