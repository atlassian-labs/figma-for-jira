import { connectInstallationRepository } from './connect-installation-repository';
import { figmaTeamRepository } from './figma-team-repository';

import type { FigmaTeam } from '../../domain/entities';
import {
	generateConnectInstallationCreateParams,
	generateFigmaTeamCreateParams,
} from '../../domain/entities/testing';

const figmaTeamComparer = (first: FigmaTeam, second: FigmaTeam) =>
	first.id - second.id;

describe('FigmaTeamRepository', () => {
	describe('findManyByConnectInstallationId', () => {
		it('should return teams with given connect installation ID', async () => {
			const [targetConnectInstallation, anotherConnectInstallation] =
				await Promise.all([
					connectInstallationRepository.upsert(
						generateConnectInstallationCreateParams(),
					),
					connectInstallationRepository.upsert(
						generateConnectInstallationCreateParams(),
					),
				]);
			const [targetFigmaTeam1, targetFigmaTeam2] = await Promise.all([
				figmaTeamRepository.upsert(
					generateFigmaTeamCreateParams({
						connectInstallationId: targetConnectInstallation.id,
					}),
				),
				figmaTeamRepository.upsert(
					generateFigmaTeamCreateParams({
						connectInstallationId: targetConnectInstallation.id,
					}),
				),
				figmaTeamRepository.upsert(
					generateFigmaTeamCreateParams({
						connectInstallationId: anotherConnectInstallation.id,
					}),
				),
			]);

			const result = await figmaTeamRepository.findManyByConnectInstallationId(
				targetConnectInstallation.id,
			);

			expect(result.sort(figmaTeamComparer)).toEqual(
				[targetFigmaTeam1, targetFigmaTeam2].sort(figmaTeamComparer),
			);
		});

		it('should return empty array when there is no teams with given connect installation ID', async () => {
			const [targetConnectInstallation, anotherConnectInstallation] =
				await Promise.all([
					connectInstallationRepository.upsert(
						generateConnectInstallationCreateParams(),
					),
					connectInstallationRepository.upsert(
						generateConnectInstallationCreateParams(),
					),
				]);
			await Promise.all([
				figmaTeamRepository.upsert(
					generateFigmaTeamCreateParams({
						connectInstallationId: anotherConnectInstallation.id,
					}),
				),
			]);

			const result = await figmaTeamRepository.findManyByConnectInstallationId(
				targetConnectInstallation.id,
			);

			expect(result).toEqual([]);
		});
	});
});
