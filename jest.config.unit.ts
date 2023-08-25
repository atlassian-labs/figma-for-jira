import baseConfig from './jest.config';

const config = {
	...baseConfig,
	testRegex: '(\\.|/)(test|spec)\\.tsx?$',
};

export default config;
