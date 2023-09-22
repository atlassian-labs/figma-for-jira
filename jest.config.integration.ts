import { Config } from 'jest';
import baseConfig from './jest.config';

const config: Config = {
	...baseConfig,
	setupFilesAfterEnv: ['<rootDir>/scripts/setup-jest-integration-tests.ts'],
	testRegex: '(\\.|/)integration\\.test.tsx?$',
};

export default config;
