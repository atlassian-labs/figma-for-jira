import { v4 as uuidv4 } from 'uuid';

import { JIRA_ISSUE_ATI } from '../../domain/entities';
import {
	generateConnectInstallation,
	generateFigmaDesignIdentifier,
	generateFigmaDesignUrl,
	generateJiraIssueAri,
	generateJiraIssueId,
} from '../../domain/entities/testing';
import type { AssociateEntityUseCaseParams } from '../associate-entity-use-case';
import type { DisassociateEntityUseCaseParams } from '../disassociate-entity-use-case';

export const generateAssociateEntityUseCaseParams = ({
	entityUrl = generateFigmaDesignUrl(),
	issueId = generateJiraIssueId(),
	connectInstallation = generateConnectInstallation(),
} = {}): AssociateEntityUseCaseParams => ({
	entity: {
		url: entityUrl,
	},
	associateWith: {
		ari: generateJiraIssueAri({ issueId }),
		ati: JIRA_ISSUE_ATI,
		id: issueId,
		cloudId: uuidv4(),
	},
	atlassianUserId: uuidv4(),
	connectInstallation,
});

export const generateDisassociateEntityUseCaseParams = ({
	entityId = generateFigmaDesignIdentifier().toAtlassianDesignId(),
	issueId = generateJiraIssueId(),
	connectInstallation = generateConnectInstallation(),
} = {}): DisassociateEntityUseCaseParams => ({
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
	atlassianUserId: uuidv4(),
	connectInstallation,
});
