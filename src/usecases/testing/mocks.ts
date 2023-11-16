import { v4 as uuidv4 } from 'uuid';

import { JIRA_ISSUE_ATI } from '../../domain/entities';
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
	entityUrl = generateFigmaDesignUrl(),
	issueId = generateJiraIssueId(),
	atlassianUserId = uuidv4(),
	connectInstallation = generateConnectInstallation(),
} = {}): AssociateDesignUseCaseParams => ({
	entity: {
		url: entityUrl,
	},
	associateWith: {
		ari: generateJiraIssueAri({ issueId }),
		ati: JIRA_ISSUE_ATI,
		id: issueId,
		cloudId: uuidv4(),
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
	entity: {
		ari: 'NOT_USED',
		id: entityId,
	},
	disassociateFrom: {
		ari: generateJiraIssueAri({ issueId }),
		ati: JIRA_ISSUE_ATI,
		id: issueId,
		cloudId: uuidv4(),
	},
	atlassianUserId,
	connectInstallation,
});
