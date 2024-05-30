import type { Config } from 'jest';

const config: Config = {
	preset: 'ts-jest',
	testEnvironment: 'node',
	maxWorkers: 4,
	rootDir: '.',
	roots: ['<rootDir>/src'],
	testRegex: '(\\.|/)(test|spec)\\.tsx?$',
	setupFiles: ['dotenv-expand/config'],
	restoreMocks: true,
	resetModules: true,
};

export default config;
