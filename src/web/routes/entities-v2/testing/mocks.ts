import type { ConnectInstallation } from '../../../../domain/entities';
import { generateFigmaDesignUrl } from '../../../../domain/entities/testing';
import { generateJiraServerSymmetricJwtToken } from '../../../testing';
import type { GetEntityByUrlRequestBody } from '../types';

export const generateGetEntityByUrlAuthorisationHeader = ({
	connectInstallation,
	userId,
}: {
	readonly connectInstallation: ConnectInstallation;
	readonly userId: string;
}) => {
	const jwt = generateJiraServerSymmetricJwtToken({
		request: {
			method: 'POST',
			pathname: '/entities/getEntityByUrl',
			query: { userId },
		},
		connectInstallation,
	});

	return `JWT ${jwt}`;
};

export const generateGetEntityByUrlRequestBody = ({
	url = generateFigmaDesignUrl().toString(),
}: {
	readonly url?: string;
} = {}): GetEntityByUrlRequestBody => ({
	entity: {
		url,
	},
});
