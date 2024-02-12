import type { FigmaDesignIdentifier } from '../domain/entities';
import { AtlassianAssociation } from '../domain/entities';
import { eventBus, getLogger } from '../infrastructure';
import { figmaService } from '../infrastructure/figma';
import { jiraService } from '../infrastructure/jira';
import { connectInstallationRepository } from '../infrastructure/repositories';
import type { AtlassianEntity } from '../usecases/types';

const JOB_NAME = 'submitFullDesign';

export type BackfillFullDesignJobParams = {
	readonly figmaDesignId: FigmaDesignIdentifier;
	readonly associateWith: AtlassianEntity;
	readonly atlassianUserId: string;
	readonly connectInstallationId: string;
};

/**
 * Fetches a design with the given ID from Figma and submits it to Jira.
 *
 * The job does not manage Jira Issue Properties or Figma Dev Resources. Therefore, it should only be used to enrich a
 * previously submitted design with more accurate data.
 *
 * Fetching a design from Figma can be a long-running operation dues to API latency. Therefore, consider running the job
 * asynchronously.
 */
export const submitFullDesign = async ({
	figmaDesignId,
	associateWith,
	atlassianUserId,
	connectInstallationId,
}: BackfillFullDesignJobParams): Promise<void> => {
	try {
		getLogger().info({ job: JOB_NAME, figmaDesignId }, 'The job is started.');

		const connectInstallation = await connectInstallationRepository.get(
			connectInstallationId,
		);

		// Fetch a design strictly with the given ID (e.g., does not fallback to a Figma File when a Figma Node is not
		// found via `figmaService.getDesignOrParent`) to avoid submitting a new design and causing data inconsistencies.
		const design = await figmaService.getDesign(figmaDesignId, {
			atlassianUserId,
			connectInstallationId: connectInstallation.id,
		});

		// If a design is not found, it either has been deleted or a user does not have access to the design.
		// Therefore, it is not possible to perform a full backfill.
		if (!design) {
			eventBus.emit('job.submit-full-design.cancelled');
			return;
		}

		const designIssueAssociation =
			AtlassianAssociation.createDesignIssueAssociation(associateWith.ari);

		await jiraService.submitDesign(
			{
				design,
				addAssociations: [designIssueAssociation],
			},
			connectInstallation,
		);

		eventBus.emit('job.submit-full-design.succeeded');
	} catch (e) {
		getLogger().error(e, 'Failed to submit a full design.', {
			job: JOB_NAME,
			figmaDesignId,
			associateWith,
			atlassianUserId,
		});
		eventBus.emit('job.submit-full-design.failed');
	}
};
