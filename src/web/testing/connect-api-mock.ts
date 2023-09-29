import { HttpStatusCode } from 'axios';
import nock from 'nock';

/**
 * @see https://developer.atlassian.com/cloud/jira/platform/security-for-connect-apps/#validating-installation-lifecycle-requests
 */
export const mockConnectKeyEndpoint = ({
	baseUrl,
	keyId,
	publicKey,
	status = HttpStatusCode.Ok,
}: {
	baseUrl: string;
	keyId: string;
	publicKey: string;
	status: HttpStatusCode;
}) => {
	nock(baseUrl).get(`/${keyId}`).reply(status, publicKey);
};
