import { PrismaClient } from '@prisma/client';

let prismaClient: PrismaClient;

/**
 * @internal
 */
export const getPrismaClient = (): PrismaClient => {
	if (!prismaClient) {
		// By default, Prisma connects to the DB using the DATABASE_URL
		// environment variable
		prismaClient = new PrismaClient();
	}
	return prismaClient;
};
