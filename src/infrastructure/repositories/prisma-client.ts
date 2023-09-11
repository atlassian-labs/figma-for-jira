import { PrismaClient } from '@prisma/client';

let client: PrismaClient | undefined;

/**
 * @internal
 */
export const prismaClient = {
	get: () => {
		if (!client) {
			// By default, Prisma connects to the DB using the DATABASE_URL
			// environment variable
			client = new PrismaClient();
		}
		return client;
	},
	disconnect: async () => {
		if (client) {
			await client.$disconnect();
			client = undefined;
		}
	},
};
