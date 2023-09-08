import { cleanAll, isDone, pendingMocks } from 'nock';
import { prismaClient } from '../src/infrastructure/repositories/prisma-client';

afterEach(() => {
	let unusedNockMocks: string[] = [];
	if (!isDone()) {
		unusedNockMocks = pendingMocks();
	}
	cleanAll();
	if (unusedNockMocks.length > 0)
		throw new Error(
			`Endpoints mocked with nock were unused:\n${unusedNockMocks.join('\n')}`,
		);
});

afterAll((done) => {
	prismaClient.disconnect().then(done);
});
