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
}: {
	readonly connectInstallation: ConnectInstallation;
}): string => {
	const jwt = generateJiraServerSymmetricJwtToken({
		request: {
			method: 'POST',
			pathname: '/entities/getEntityByUrl',
		},
		connectInstallation,
	});

	return `JWT ${jwt}`;
};

export const generateGetEntityByUrlRequestBody = ({
	url = generateFigmaDesignUrl().toString(),
	userId,
}: {
	readonly url?: string;
	readonly userId: string;
}): GetEntityByUrlRequestBody => ({
	entity: {
		url,
	},
	user: {
		id: userId,
	},
});

export const generateOnEntityAssociatedAuthorisationHeader = ({
	connectInstallation,
}: {
	readonly connectInstallation: ConnectInstallation;
}): string => {
	return generateJiraServerSymmetricJwtToken({
		request: {
			method: 'PUT',
			pathname: '/entities/onEntityAssociated',
		},
		connectInstallation,
	});
};

export const generateOnEntityAssociatedRequestBody = ({
	entityId = generateFigmaDesignIdentifier().toAtlassianDesignId(),
	issueId = generateJiraIssueId(),
	issueAri = generateJiraIssueAri({ issueId }),
	userId,
}: {
	readonly entityId?: string;
	readonly issueId?: string;
	readonly issueAri?: string;
	readonly userId?: string;
} = {}): OnEntityAssociatedRequestBody => ({
	entity: {
		ari: 'NOT_USED',
		id: entityId,
	},
	associatedWith: {
		ati: 'ati:cloud:jira:issue',
		ari: issueAri,
		cloudId: uuidv4(),
		id: issueId,
	},
	user: {
		id: userId,
	},
});

export const generateOnEntityDisassociatedAuthorisationHeader = ({
	connectInstallation,
}: {
	readonly connectInstallation: ConnectInstallation;
}): string => {
	return generateJiraServerSymmetricJwtToken({
		request: {
			method: 'PUT',
			pathname: '/entities/onEntityDisassociated',
		},
		connectInstallation,
	});
};

export const generateOnEntityDisassociatedRequestBody = ({
	entityId = generateFigmaDesignIdentifier().toAtlassianDesignId(),
	issueId = generateJiraIssueId(),
	issueAri = generateJiraIssueAri({ issueId }),
	userId,
}: {
	readonly entityId?: string;
	readonly issueId?: string;
	readonly issueAri?: string;
	readonly userId?: string;
} = {}): OnEntityDisassociatedRequestBody => ({
	entity: {
		ari: 'NOT_USED',
		id: entityId,
	},
	disassociatedFrom: {
		ati: 'ati:cloud:jira:issue',
		ari: issueAri,
		cloudId: uuidv4(),
		id: issueId,
	},
	user: {
		id: userId,
	},
});
