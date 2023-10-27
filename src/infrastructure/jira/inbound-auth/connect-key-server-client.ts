import axios from 'axios';

import { getConfig } from '../../../config';
import { withAxiosErrorTranslation } from '../../axios-utils';

export class ConnectKeyServerClient {
	/**
	 * Returns the public key for asymmetric JWT token validation.
	 *
	 * @see https://developer.atlassian.com/cloud/jira/platform/understanding-jwt-for-connect-apps/#verifying-a-asymmetric-jwt-token-for-install-callbacks
	 *
	 * @throws {HttpClientError} An error associated with specific HTTP response status codes.
	 */
	getAtlassianConnectPublicKey = async (keyId: string): Promise<string> =>
		withAxiosErrorTranslation(async () => {
			const response = await axios.get<string>(
				`${getConfig().jira.connectKeyServerUrl}/${keyId}`,
			);
			return response.data;
		});
}

export const connectKeyServerClient = new ConnectKeyServerClient();
