import baseConfig from './jest.config';

const config = {
	...baseConfig,
	testRegex: '^(?!.*integration.*)(\\.|/)(test|spec)\\.tsx?$',
};

export default config;
