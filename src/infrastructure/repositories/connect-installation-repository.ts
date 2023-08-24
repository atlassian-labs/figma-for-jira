import type { ConnectInstallation as PrismaConnectInstallation } from '@prisma/client';

import { getPrismaClient } from './prisma-client';

import { logger } from '..';
import {
	ConnectInstallation,
	ConnectInstallationCreateParams,
} from '../../domain/entities';

const mapToDomainType = ({
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

export class ConnectInstallationRepository {
	find = async (key: string): Promise<ConnectInstallation> => {
		const result = await getPrismaClient().connectInstallation.findFirstOrThrow(
			{
				where: { key },
			},
		);
		return mapToDomainType(result);
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
			return mapToDomainType(result);
		} catch (e: unknown) {
			logger.error(e, 'Failed to upsert %s', installation.key);
			throw e;
		}
	};
}

export const connectInstallationRepository =
	new ConnectInstallationRepository();
