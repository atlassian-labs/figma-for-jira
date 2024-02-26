import type { FigmaTeam } from '../domain/entities';
import { eventBus, getLogger } from '../infrastructure';
import { handleFigmaFileUpdateEventUseCase } from '../usecases';
import type { FigmaFileUpdateWebhookEventRequestBody } from '../web/routes/figma';

const JOB_NAME = 'handleFigmaFileUpdateEvent';

export const handleFigmaFileUpdateEvent = async (
	requestBody: FigmaFileUpdateWebhookEventRequestBody,
	figmaTeam: FigmaTeam,
): Promise<void> => {
	const { file_key: fileKey, webhook_id: webhookId } = requestBody;
	const logger = getLogger().child({ job: JOB_NAME, webhookId });
	try {
		await handleFigmaFileUpdateEventUseCase.execute(figmaTeam, fileKey);

		logger.info('Figma webhook callback succeeded.');
		eventBus.emit('job.handle-figma-file-update-event.succeeded', {
			webhookId,
		});
	} catch (e) {
		logger.error(e, 'Figma webhook callback failed.');
		eventBus.emit('job.handle-figma-file-update-event.failed', { webhookId });
	}
};
