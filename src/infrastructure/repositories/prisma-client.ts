import { PrismaClient } from '@prisma/client';

let prismaClient: PrismaClient;

/**
 * @internal
 */
export const getPrismaClient = (): PrismaClient => {
	if (!prismaClient) {
		console.log(
			'!!!!!!!!!CTZ TEST!!!!! DATABASE_URL:',
			process.env.DATABASE_URL,
		);
		prismaClient = new PrismaClient();
	}
	return prismaClient;
};
