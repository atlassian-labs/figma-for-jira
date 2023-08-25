import baseConfig from './jest.config';

const config = {
	...baseConfig,
	testRegex: '(\\.|/)it\\.tsx?$',
};

export default config;
