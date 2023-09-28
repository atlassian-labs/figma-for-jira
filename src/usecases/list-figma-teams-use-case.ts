import type { FigmaTeamSummary } from '../domain/entities';
import { figmaTeamRepository } from '../infrastructure/repositories';

export const listFigmaTeamsUseCase = {
	execute: async (
		connectInstallationId: string,
	): Promise<FigmaTeamSummary[]> => {
		return figmaTeamRepository.findManySummaryByConnectInstallationId(
			connectInstallationId,
		);
	},
};
