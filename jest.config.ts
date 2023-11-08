import type { Config } from 'jest';

const config: Config = {
	preset: 'ts-jest',
	testEnvironment: 'node',
	maxWorkers: 4,
	rootDir: '.',
	roots: ['<rootDir>/src', '<rootDir>/admin'],
	testRegex: '(\\.|/)(test|spec)\\.tsx?$',
	setupFiles: ['dotenv-expand/config'],
	clearMocks: true,
};

export default config;
