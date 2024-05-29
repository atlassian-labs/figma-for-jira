import { v4 as uuidv4 } from 'uuid';

import {
	generateConnectInstallation,
	generateFigmaDesignIdentifier,
	generateFigmaDesignUrl,
	generateJiraIssueAri,
	generateJiraIssueId,
} from '../../domain/entities/testing';
import type { AssociateDesignUseCaseParams } from '../associate-design-use-case';
import type { DisassociateDesignUseCaseParams } from '../disassociate-design-use-case';

export const generateAssociateDesignUseCaseParams = ({
	designUrl = generateFigmaDesignUrl(),
	issueId = generateJiraIssueId(),
	atlassianUserId = uuidv4(),
	connectInstallation = generateConnectInstallation(),
} = {}): AssociateDesignUseCaseParams => ({
	designUrl,
	associateWithIssue: {
		ari: generateJiraIssueAri({ issueId }),
		id: issueId,
	},
	atlassianUserId,
	connectInstallation,
});

export const generateBackfillDesignUseCaseParams = ({
	designUrl = generateFigmaDesignUrl(),
	issueId = generateJiraIssueId(),
	atlassianUserId = uuidv4(),
	connectInstallation = generateConnectInstallation(),
} = {}): AssociateDesignUseCaseParams => ({
	designUrl,
	associateWithIssue: {
		ari: generateJiraIssueAri({ issueId }),
		id: issueId,
	},
	atlassianUserId,
	connectInstallation,
});

export const generateDisassociateDesignUseCaseParams = ({
	entityId = generateFigmaDesignIdentifier().toAtlassianDesignId(),
	issueId = generateJiraIssueId(),
	atlassianUserId = uuidv4(),
	connectInstallation = generateConnectInstallation(),
} = {}): DisassociateDesignUseCaseParams => ({
	design: {
		ari: 'NOT_USED',
		id: entityId,
	},
	disassociateFromIssue: {
		ari: generateJiraIssueAri({ issueId }),
		id: issueId,
	},
	atlassianUserId,
	connectInstallation,
});
