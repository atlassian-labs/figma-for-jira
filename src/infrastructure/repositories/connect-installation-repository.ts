import type { ConnectInstallation as PrismaConnectInstallation } from '@prisma/client';

import { getPrismaClient } from './prisma-client';

import { getLogger } from '..';
import type {
	ConnectInstallation,
	ConnectInstallationCreateParams,
} from '../../domain/entities';

export class ConnectInstallationRepository {
	getByClientKey = async (clientKey: string): Promise<ConnectInstallation> => {
		const result = await getPrismaClient().connectInstallation.findFirstOrThrow(
			{
				where: { clientKey },
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
				where: { clientKey: installation.clientKey },
			});
			return this.mapToDomainModel(result);
		} catch (e: unknown) {
			getLogger().error(e, 'Failed to upsert %s', installation.key);
			throw e;
		}
	};

	delete = async (clientKey: string): Promise<ConnectInstallation> => {
		try {
			const result = await getPrismaClient().connectInstallation.delete({
				where: { clientKey },
			});
			return this.mapToDomainModel(result);
		} catch (err) {
			getLogger().error(
				err,
				'Failed to delete connect installation for clientKey %s',
				clientKey,
			);
			throw err;
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
