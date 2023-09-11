import { Request } from 'express';
import { cleanAll, emitter, isDone, pendingMocks } from 'nock';
import { prismaClient } from '../src/infrastructure/repositories/prisma-client';

let unmatchedRequests: Request[] = [];
beforeAll(() => {
	// Add an event listener on the emitter to check for requests that weren't mocked
	emitter.on('no match', (req: Request) => {
		// Ignore local since supertest must be able to make API calls to local endpoints
		if (req.hostname !== '127.0.0.1') {
			unmatchedRequests.push(req);
		}
	});
});

/**
 *  After each test, check for requests that went through
 *  without being mocked by nock.
 */
afterEach(() => {
	const numberOfUnmatchedRequests = unmatchedRequests.length;
	if (numberOfUnmatchedRequests > 0) {
		console.log(
			`Unmatched requests [${numberOfUnmatchedRequests}]:`,
			unmatchedRequests,
		);
		// Clear the unmatched requests after each test so it's fresh for the next
		unmatchedRequests = [];
		throw new Error(`${numberOfUnmatchedRequests} Unmatched Requests`);
	}
});

/**
 * After each test, check that we haven't overly mocked our endpoints.
 */
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

/**
 * Ensure we disconnect the prismaClient before letting jest cleanup to
 * prevent leaking tests.
 */
afterAll((done) => {
	prismaClient.disconnect().then(done);
});
