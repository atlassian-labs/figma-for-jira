import { Request } from 'express';
import { cleanAll, emitter } from 'nock';
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
 * After each test, clean up nock mocks
 */
afterEach(() => {
	cleanAll();
});

/**
 * Ensure we disconnect the prismaClient before letting jest cleanup to
 * prevent leaking tests.
 */
afterAll((done) => {
	prismaClient.disconnect().then(done);
});
