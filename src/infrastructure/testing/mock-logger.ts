// This file is used in our Jest config's setupFiles to mock the logger for all unit tests

jest.mock('../../infrastructure/logger', () => {
	const original = jest.requireActual<
		typeof import('../../infrastructure/logger')
	>('../../infrastructure/logger');

	return {
		__esModule: true,
		...original,
		getLogger: () => ({
			info: jest.fn(),
			warn: jest.fn(),
			error: jest.fn(),
			debug: jest.fn(),
		}),
	};
});
