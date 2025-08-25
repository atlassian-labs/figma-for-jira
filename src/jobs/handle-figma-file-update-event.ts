import type {
	WebhookDevModeStatusUpdatePayload,
	WebhookFileUpdatePayload,
} from '@figma/rest-api-spec';

import { eventBus, getLogger } from '../infrastructure';
import { handleFigmaFileUpdateEventUseCase } from '../usecases';
import type { FigmaWebhookInfo } from '../web/routes/figma';

export const handleFigmaFileUpdateEvent = async (
	requestBody: WebhookFileUpdatePayload | WebhookDevModeStatusUpdatePayload,
	webhookInfo: FigmaWebhookInfo,
): Promise<void> => {
	const { file_key: fileKey, webhook_id: webhookId } = requestBody;
	const logger = getLogger().child({
		job: 'handleFigmaFileUpdateEvent',
		webhookId,
	});
	try {
		await handleFigmaFileUpdateEventUseCase.execute(webhookInfo, fileKey);
		logger.info('Figma webhook callback succeeded.');
		eventBus.emit('job.handle-figma-file-update-event.succeeded', {
			webhookId,
		});
	} catch (e) {
		logger.error(e, 'Figma webhook callback failed.');
		eventBus.emit('job.handle-figma-file-update-event.failed', { webhookId });
	}
};
