import { eventBus } from '../event-bus';

export function waitForEvent(eventName: string): Promise<void> {
	return new Promise((resolve) => {
		eventBus.once(eventName, resolve);
	});
}
