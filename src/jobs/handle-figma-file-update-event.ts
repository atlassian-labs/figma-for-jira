import type { FigmaTeam } from '../domain/entities';
import { eventBus, getLogger } from '../infrastructure';
import { handleFigmaFileUpdateEventUseCase } from '../usecases';
import type { FigmaFileUpdateWebhookEventRequestBody } from '../web/routes/figma';

export const handleFigmaFileUpdateEvent = async (
	requestBody: FigmaFileUpdateWebhookEventRequestBody,
	figmaTeam: FigmaTeam,
): Promise<void> => {
	const { file_key: fileKey, webhook_id: webhookId } = requestBody;
	try {
		await handleFigmaFileUpdateEventUseCase.execute(figmaTeam, fileKey);

		getLogger().info({ webhookId }, 'Figma webhook callback succeeded.');
		eventBus.emit('figma.webhook.succeeded', { webhookId });
	} catch (e) {
		getLogger().error(e, 'Figma webhook callback failed.', {
			webhookId,
		});
		eventBus.emit('figma.webhook.failed', { webhookId });
	}
};
