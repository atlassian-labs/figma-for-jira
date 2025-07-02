import type { LDClient, LDOptions } from 'launchdarkly-node-server-sdk';
import { init } from 'launchdarkly-node-server-sdk';

import { getLogger } from '../infrastructure';

import { getConfig } from '.';

export async function getLDClient(): Promise<LDClient | null> {
	const ldSecretKey = getLaunchDarklySecretKey();

	if (!ldSecretKey) {
		getLogger().error(`No LaunchDarkly secret available.`);
		return null;
	}

	const options: LDOptions = {
		logger: {
			error: (message) => getLogger().error(message),
			warn: (message) => getLogger().warn(message),
			info: () => {},
			debug: () => {},
		},
	};
	const client = init(ldSecretKey, options);
	await client.waitForInitialization();
	return client;
}

export async function getFeatureFlag<T>(
	client: LDClient | null,
	flag: string,
	defaultValue: T,
): Promise<T> {
	if (!client) {
		getLogger().error(
			`No LaunchDarkly client provided, using default value for flag ${flag}: ${JSON.stringify(
				defaultValue,
			)}`,
		);
		return defaultValue;
	}

	const featureFlag = (await client.variation(
		flag,
		{ key: 'figma-for-jira' },
		defaultValue,
	)) as T;
	return featureFlag;
}

function getLaunchDarklySecretKey(): string | undefined {
	const env = getConfig().figma.clusterName;

	let secretKey: string | undefined = undefined;

	switch (env) {
		case 'gov':
		case 'production':
		case 'staging':
			secretKey = process.env['LAUNCH_DARKLY_SECRET_KEY'];
			break;

		default: {
			const rawMap = process.env['LAUNCH_DARKLY_SECRET_KEY_MAP'];
			if (!rawMap) {
				secretKey = undefined;
			} else {
				const map = JSON.parse(rawMap) as unknown;
				if (map && typeof map === 'object' && env in map) {
					const value = map[env] as unknown;
					if (typeof value === 'string') {
						secretKey = value;
					}
				}
			}
		}
	}

	if (secretKey === undefined) {
		getLogger().error('LaunchDarkly secret is undefined');
	} else {
		getLogger().info('LaunchDarkly secret is defined');
	}

	return secretKey;
}
