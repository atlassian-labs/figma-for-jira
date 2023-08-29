import baseConfig from './jest.config';

const config = {
	...baseConfig,
	testRegex: '^(?!.*integration.*)(.*)(\\.|/)(test|spec)\\.tsx?$',
	setupFiles: [
		...(baseConfig.setupFiles ?? []),
		'./src/infrastructure/testing/mock-logger.ts',
	],
};

export default config;
