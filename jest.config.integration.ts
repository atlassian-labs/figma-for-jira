import baseConfig from './jest.config';

const config = {
	...baseConfig,
	testRegex: '(\\.|/)integration\\.test.tsx?$',
};

export default config;
