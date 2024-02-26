import type { FigmaDesignIdentifier } from '../domain/entities';
import { eventBus, getLogger } from '../infrastructure';
import { figmaService } from '../infrastructure/figma';
import { jiraService } from '../infrastructure/jira';
import { connectInstallationRepository } from '../infrastructure/repositories';

const JOB_NAME = 'submitFullDesign';

export type SubmitFullDesignJobParams = {
	readonly figmaDesignId: FigmaDesignIdentifier;
	readonly atlassianUserId: string;
	readonly connectInstallationId: string;
};

/**
 * Fetches a design with the given ID from Figma and submits it to Jira.
 *
 * The job does not manage Jira Issue Properties or Figma Dev Resources. Therefore, it should only be used to enrich a
 * previously submitted design with more accurate data.
 *
 * The job can take a significant amount of time for large designs. Therefore, consider running the job
 * asynchronously.
 */
export const submitFullDesign = async ({
	figmaDesignId,
	atlassianUserId,
	connectInstallationId,
}: SubmitFullDesignJobParams): Promise<void> => {
	const logger = getLogger().child({ job: JOB_NAME, figmaDesignId });
	try {
		logger.info('The job is started.');

		const connectInstallation = await connectInstallationRepository.get(
			connectInstallationId,
		);

		// Fetch a design strictly with the given ID (e.g., does not fall back to a Figma File when a Figma Node is not
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

		await jiraService.submitDesign(
			{
				design,
			},
			connectInstallation,
		);

		eventBus.emit('job.submit-full-design.succeeded');
		logger.info('The job was successfully completed.');
	} catch (e) {
		logger.error(e, 'The job failed.', {
			atlassianUserId,
		});
		eventBus.emit('job.submit-full-design.failed');
	}
};
