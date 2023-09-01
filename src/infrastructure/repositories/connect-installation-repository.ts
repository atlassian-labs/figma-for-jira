import type { ConnectInstallation as PrismaConnectInstallation } from '@prisma/client';

import { RepositoryRecordNotFoundError } from './errors';
import { getPrismaClient } from './prisma-client';

import {
	ConnectInstallation,
	ConnectInstallationCreateParams,
} from '../../domain/entities';

export class ConnectInstallationRepository {
	find = async (key: string): Promise<ConnectInstallation> => {
		const result = await getPrismaClient().connectInstallation.findFirst({
			where: { key },
		});
		if (result === null) {
			throw new RepositoryRecordNotFoundError(
				`Failed to find ConnectInstallation with key ${key}`,
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
			where: { key: installation.key },
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
