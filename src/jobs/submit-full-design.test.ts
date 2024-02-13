import { v4 as uuidv4 } from 'uuid';

import { submitFullDesign } from './submit-full-design';

import { AtlassianAssociation, JIRA_ISSUE_ATI } from '../domain/entities';
import {
	generateAtlassianDesign,
	generateConnectInstallation,
	generateFigmaDesignIdentifier,
	generateJiraIssue,
	generateJiraIssueAri,
} from '../domain/entities/testing';
import { figmaService } from '../infrastructure/figma';
import { jiraService } from '../infrastructure/jira';
import { connectInstallationRepository } from '../infrastructure/repositories';

describe('submitFullDesign', () => {
	it('should submit design', async () => {
		const connectInstallation = generateConnectInstallation();
		const cloudId = uuidv4();
		const atlassianUserId = uuidv4();
		const issue = generateJiraIssue();
		const issueAri = generateJiraIssueAri({ cloudId, issueId: issue.id });
		const figmaDesignId = generateFigmaDesignIdentifier();
		const atlassianDesign = generateAtlassianDesign({
			id: figmaDesignId.toAtlassianDesignId(),
		});
		jest
			.spyOn(connectInstallationRepository, 'get')
			.mockResolvedValue(connectInstallation);
		jest.spyOn(figmaService, 'getDesign').mockResolvedValue(atlassianDesign);
		jest.spyOn(jiraService, 'submitDesign').mockResolvedValue();

		await submitFullDesign({
			figmaDesignId,
			associateWith: {
				ari: issueAri,
				ati: JIRA_ISSUE_ATI,
				id: issue.id,
				cloudId,
			},
			atlassianUserId,
			connectInstallationId: connectInstallation.id,
		});

		expect(connectInstallationRepository.get).toHaveBeenCalledWith(
			connectInstallation.id,
		);
		expect(figmaService.getDesign).toHaveBeenCalledWith(figmaDesignId, {
			atlassianUserId,
			connectInstallationId: connectInstallation.id,
		});
		expect(jiraService.submitDesign).toHaveBeenCalledWith(
			{
				design: atlassianDesign,
				addAssociations: [
					AtlassianAssociation.createDesignIssueAssociation(issueAri),
				],
			},
			connectInstallation,
		);
	});

	it('should exit if design is not found', async () => {
		const connectInstallation = generateConnectInstallation();
		const cloudId = uuidv4();
		const atlassianUserId = uuidv4();
		const issue = generateJiraIssue();
		const issueAri = generateJiraIssueAri({ cloudId, issueId: issue.id });
		const figmaDesignId = generateFigmaDesignIdentifier();
		jest
			.spyOn(connectInstallationRepository, 'get')
			.mockResolvedValue(connectInstallation);
		jest.spyOn(figmaService, 'getDesign').mockResolvedValue(null);
		jest.spyOn(jiraService, 'submitDesign').mockResolvedValue();

		await submitFullDesign({
			figmaDesignId,
			associateWith: {
				ari: issueAri,
				ati: JIRA_ISSUE_ATI,
				id: issue.id,
				cloudId,
			},
			atlassianUserId,
			connectInstallationId: connectInstallation.id,
		});

		expect(jiraService.submitDesign).not.toHaveBeenCalled();
	});
});
