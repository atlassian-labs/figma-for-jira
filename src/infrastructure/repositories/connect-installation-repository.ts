import type { ConnectInstallation as PrismaConnectInstallation } from '@prisma/client';

import { RepositoryRecordNotFoundError } from './errors';
import { getPrismaClient } from './prisma-client';

import type {
	ConnectInstallation,
	ConnectInstallationCreateParams,
} from '../../domain/entities';
import { getLogger } from '../logger';

export class ConnectInstallationRepository {
	getByClientKey = async (clientKey: string): Promise<ConnectInstallation> => {
		const result = await getPrismaClient().connectInstallation.findFirst({
			where: { clientKey },
		});
		if (result === null) {
			throw new RepositoryRecordNotFoundError(
				`Failed to find ConnectInstallation for clientKey ${clientKey}`,
			);
		}
		return this.mapToDomainModel(result);
	};

	upsert = async (
		installation: ConnectInstallationCreateParams,
	): Promise<ConnectInstallation> => {
		const result = await getPrismaClient().connectInstallation.upsert({
			create: installation,
			update: installation,
			where: { clientKey: installation.clientKey },
		});
		return this.mapToDomainModel(result);
	};

	delete = async (clientKey: string): Promise<ConnectInstallation> => {
		const result = await getPrismaClient().connectInstallation.delete({
			where: { clientKey },
		});
		return this.mapToDomainModel(result);
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
