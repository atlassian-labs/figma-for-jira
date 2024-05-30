import { Config } from 'jest';
import baseConfig from './jest.config';

const config: Config = {
	...baseConfig,
	testRegex: '^(?!.*integration\\..*)(.*)(\\.|/)(test|spec)\\.tsx?$',
};

export default config;
