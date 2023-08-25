import type { ConnectInstallation as PrismaConnectInstallation } from '@prisma/client';

import { getPrismaClient } from './prisma-client';

import { getLogger } from '..';
import {
	ConnectInstallation,
	ConnectInstallationCreateParams,
} from '../../domain/entities';

export class ConnectInstallationRepository {
	find = async (key: string): Promise<ConnectInstallation> => {
		const result = await getPrismaClient().connectInstallation.findFirstOrThrow(
			{
				where: { key },
			},
		);
		return this.mapToDomainModel(result);
	};

	upsert = async (
		installation: ConnectInstallationCreateParams,
	): Promise<ConnectInstallation> => {
		try {
			const result = await getPrismaClient().connectInstallation.upsert({
				create: installation,
				update: installation,
				where: { key: installation.key },
			});
			return this.mapToDomainModel(result);
		} catch (e: unknown) {
			getLogger().error(e, 'Failed to upsert %s', installation.key);
			throw e;
		}
	};

	private mapToDomainModel = ({
		id,
		key,
		clientKey,
		sharedSecret,
		baseUrl,
		displayUrl,
	}: PrismaConnectInstallation): ConnectInstallation => ({
		id,
		key,
		clientKey,
		sharedSecret,
		baseUrl,
		displayUrl,
	});
}

export const connectInstallationRepository =
	new ConnectInstallationRepository();
