import type { Config } from 'jest';

const config: Config = {
	preset: 'ts-jest',
	testEnvironment: 'node',
	maxWorkers: 4,
	rootDir: '.',
	testRegex: '(\\.|/)test\\.tsx?$',
	clearMocks: true,
};

export default config;
