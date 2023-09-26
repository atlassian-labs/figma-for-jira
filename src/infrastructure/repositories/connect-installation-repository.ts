import type { ConnectInstallation as PrismaConnectInstallation } from '@prisma/client';
import { PrismaClientKnownRequestError } from '@prisma/client/runtime/library';

import { PrismaErrorCode } from './constants';
import { RepositoryRecordNotFoundError } from './errors';
import { prismaClient } from './prisma-client';

import type {
	ConnectInstallation,
	ConnectInstallationCreateParams,
} from '../../domain/entities';

export class ConnectInstallationRepository {
	get = async (id: string): Promise<ConnectInstallation> => {
		const dbModel = await prismaClient.get().connectInstallation.findFirst({
			where: { id: BigInt(id) },
		});
		if (dbModel === null) {
			throw new RepositoryRecordNotFoundError(
				`Failed to find ConnectInstallation for id ${id}`,
			);
		}
		return this.mapToDomainModel(dbModel);
	};

	getByClientKey = async (clientKey: string): Promise<ConnectInstallation> => {
		const dbModel = await prismaClient.get().connectInstallation.findFirst({
			where: { clientKey },
		});
		if (dbModel === null) {
			throw new RepositoryRecordNotFoundError(
				`Failed to find ConnectInstallation for clientKey ${clientKey}`,
			);
		}
		return this.mapToDomainModel(dbModel);
	};

	upsert = async (
		installation: ConnectInstallationCreateParams,
	): Promise<ConnectInstallation> => {
		const dbModel = await prismaClient.get().connectInstallation.upsert({
			create: installation,
			update: installation,
			where: { clientKey: installation.clientKey },
		});
		return this.mapToDomainModel(dbModel);
	};

	deleteByClientKey = async (
		clientKey: string,
	): Promise<ConnectInstallation> => {
		try {
			const dbModel = await prismaClient.get().connectInstallation.delete({
				where: { clientKey },
			});
			return this.mapToDomainModel(dbModel);
		} catch (e: unknown) {
			if (
				e instanceof PrismaClientKnownRequestError &&
				e.code === PrismaErrorCode.RecordNotFound
			) {
				throw new RepositoryRecordNotFoundError(e.message);
			}
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
		id: id.toString(),
		key,
		clientKey,
		sharedSecret,
		baseUrl,
		displayUrl,
	});
}

export const connectInstallationRepository =
	new ConnectInstallationRepository();
