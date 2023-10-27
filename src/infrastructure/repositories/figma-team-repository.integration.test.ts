import { v4 as uuidv4 } from 'uuid';

import { connectInstallationRepository } from './connect-installation-repository';
import { figmaTeamRepository } from './figma-team-repository';

import type { FigmaTeam } from '../../domain/entities';
import {
	generateConnectInstallationCreateParams,
	generateFigmaTeamCreateParams,
} from '../../domain/entities/testing';

const figmaTeamComparer = (first: FigmaTeam, second: FigmaTeam) =>
	first.id.localeCompare(second.id);

describe('FigmaTeamRepository', () => {
	describe('findByWebhookId', () => {
		it('should return team with given webhook ID', async () => {
			const connectInstallation = await connectInstallationRepository.upsert(
				generateConnectInstallationCreateParams(),
			);
			const webhookId = uuidv4();
			const figmaTeam = await figmaTeamRepository.upsert(
				generateFigmaTeamCreateParams({
					connectInstallationId: connectInstallation.id,
					webhookId,
				}),
			);

			const result = await figmaTeamRepository.findByWebhookId(webhookId);

			expect(result).toMatchObject(figmaTeam);
		});

		it('should return null when there is no team with given webhook ID', async () => {
			const connectInstallation = await connectInstallationRepository.upsert(
				generateConnectInstallationCreateParams(),
			);
			await figmaTeamRepository.upsert(
				generateFigmaTeamCreateParams({
					connectInstallationId: connectInstallation.id,
				}),
			);
			const webhookId = uuidv4();

			const result = await figmaTeamRepository.findByWebhookId(webhookId);

			expect(result).toBeNull();
		});
	});

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
				figmaTeamRepository
					.upsert(
						generateFigmaTeamCreateParams({
							connectInstallationId: targetConnectInstallation.id,
						}),
					)
					.then((team) =>
						figmaTeamRepository.getByTeamIdAndConnectInstallationId(
							team.teamId,
							targetConnectInstallation.id,
						),
					),
				figmaTeamRepository
					.upsert(
						generateFigmaTeamCreateParams({
							connectInstallationId: targetConnectInstallation.id,
						}),
					)
					.then((team) =>
						figmaTeamRepository.getByTeamIdAndConnectInstallationId(
							team.teamId,
							targetConnectInstallation.id,
						),
					),
				figmaTeamRepository
					.upsert(
						generateFigmaTeamCreateParams({
							connectInstallationId: anotherConnectInstallation.id,
						}),
					)
					.then((team) =>
						figmaTeamRepository.getByTeamIdAndConnectInstallationId(
							team.teamId,
							anotherConnectInstallation.id,
						),
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
				figmaTeamRepository
					.upsert(
						generateFigmaTeamCreateParams({
							connectInstallationId: anotherConnectInstallation.id,
						}),
					)
					.then((team) =>
						figmaTeamRepository.getByTeamIdAndConnectInstallationId(
							team.teamId,
							anotherConnectInstallation.id,
						),
					),
			]);

			const result = await figmaTeamRepository.findManyByConnectInstallationId(
				targetConnectInstallation.id,
			);

			expect(result).toEqual([]);
		});
	});
});
