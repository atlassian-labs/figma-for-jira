import { v4 as uuidv4 } from 'uuid';

import type { ConnectInstallation } from '../../../../domain/entities';
import {
	generateFigmaDesignIdentifier,
	generateFigmaDesignUrl,
	generateJiraIssueAri,
	generateJiraIssueId,
} from '../../../../domain/entities/testing';
import { generateJiraServerSymmetricJwtToken } from '../../../testing';
import type {
	GetEntityByUrlRequestBody,
	OnEntityAssociatedRequestBody,
	OnEntityDisassociatedRequestBody,
} from '../types';

export const generateGetEntityByUrlAuthorisationHeader = ({
	connectInstallation,
	userId,
}: {
	readonly connectInstallation: ConnectInstallation;
	readonly userId: string;
}): string => {
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

export const generateOnEntityAssociatedAuthorisationHeader = ({
	connectInstallation,
	userId,
}: {
	readonly connectInstallation: ConnectInstallation;
	readonly userId?: string;
}): string => {
	return generateJiraServerSymmetricJwtToken({
		request: {
			method: 'PUT',
			pathname: '/entities/onEntityAssociated',
			query: userId ? { userId } : undefined,
		},
		connectInstallation,
	});
};

export const generateOnEntityAssociatedRequestBody = ({
	entityId = generateFigmaDesignIdentifier().toAtlassianDesignId(),
	issueId = generateJiraIssueId(),
	issueAri = generateJiraIssueAri({ issueId }),
}: {
	readonly entityId?: string;
	readonly issueId?: string;
	readonly issueAri?: string;
} = {}): OnEntityAssociatedRequestBody => ({
	entity: {
		ari: 'NOT_USED',
		id: entityId,
	},
	associateWith: {
		ati: 'ati:cloud:jira:issue',
		ari: issueAri,
		cloudId: uuidv4(),
		id: issueId,
	},
});

export const generateOnEntityDisassociatedAuthorisationHeader = ({
	connectInstallation,
	userId,
}: {
	readonly connectInstallation: ConnectInstallation;
	readonly userId?: string;
}): string => {
	return generateJiraServerSymmetricJwtToken({
		request: {
			method: 'PUT',
			pathname: '/entities/onEntityDisassociated',
			query: userId ? { userId } : undefined,
		},
		connectInstallation,
	});
};

export const generateOnEntityDisassociatedRequestBody = ({
	entityId = generateFigmaDesignIdentifier().toAtlassianDesignId(),
	issueId = generateJiraIssueId(),
	issueAri = generateJiraIssueAri({ issueId }),
}: {
	readonly entityId?: string;
	readonly issueId?: string;
	readonly issueAri?: string;
} = {}): OnEntityDisassociatedRequestBody => ({
	entity: {
		ari: 'NOT_USED',
		id: entityId,
	},
	disassociateFrom: {
		ati: 'ati:cloud:jira:issue',
		ari: issueAri,
		cloudId: uuidv4(),
		id: issueId,
	},
});
