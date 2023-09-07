import { Config } from 'jest';
import baseConfig from './jest.config';

const config: Config = {
	...baseConfig,
	testRegex: '^(?!.*integration.*)(.*)(\\.|/)(test|spec)\\.tsx?$',
	setupFiles: [
		...(baseConfig.setupFiles ?? []),
		'<rootDir>/src/infrastructure/testing/mock-logger.ts',
	],
};

export default config;
