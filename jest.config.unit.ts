import baseConfig from './jest.config';

const config = {
	...baseConfig,
	testRegex: '^(?!.*integration.*)(.*)(\\.|/)(test|spec)\\.tsx?$',
	setupFiles: [
		...(baseConfig.setupFiles ?? []),
		'./src/common/mocks/mock-logger.ts',
	],
};

export default config;
