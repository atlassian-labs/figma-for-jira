import {
	ConfigurationState,
	jiraAppConfigurationService,
} from './jira-app-configuration-service';
import { jiraClient } from './jira-client';

import type { ConnectInstallation } from '../../domain/entities';
import { generateConnectInstallation } from '../../domain/entities/testing';
import {
	ForbiddenHttpClientError,
	NotFoundHttpClientError,
} from '../http-client-errors';

describe('JiraService', () => {
	describe('setAppConfigurationState', () => {
		it('should set configuration state in app properties', async () => {
			const configurationState = ConfigurationState.CONFIGURED;
			const connectInstallation = generateConnectInstallation();
			jest.spyOn(jiraClient, 'setAppProperty').mockResolvedValue(undefined);

			await jiraAppConfigurationService.setAppConfigurationState(
				configurationState,
				connectInstallation,
			);

			expect(jiraClient.setAppProperty).toHaveBeenCalledWith(
				'is-configured',
				{ isConfigured: configurationState },
				connectInstallation,
			);
		});
	});

	describe('deleteAppConfigurationState', () => {
		let connectInstallation: ConnectInstallation;

		beforeEach(() => {
			connectInstallation = generateConnectInstallation();
		});

		it('should delete the configuration state in app properties', async () => {
			jest.spyOn(jiraClient, 'deleteAppProperty').mockResolvedValue(undefined);

			await jiraAppConfigurationService.deleteAppConfigurationState(
				connectInstallation,
			);

			expect(jiraClient.deleteAppProperty).toHaveBeenCalledWith(
				'is-configured',
				connectInstallation,
			);
		});

		it('should not rethrow NotFoundHttpClientError errors', async () => {
			const notFoundError = new NotFoundHttpClientError();
			jest
				.spyOn(jiraClient, 'deleteAppProperty')
				.mockRejectedValue(notFoundError);

			await expect(
				jiraAppConfigurationService.deleteAppConfigurationState(
					connectInstallation,
				),
			).resolves.not.toThrow(notFoundError);
		});

		it('should rethrow unexpected errors', async () => {
			const unexpectedError = new ForbiddenHttpClientError();
			jest
				.spyOn(jiraClient, 'deleteAppProperty')
				.mockRejectedValue(unexpectedError);

			await expect(
				jiraAppConfigurationService.deleteAppConfigurationState(
					connectInstallation,
				),
			).rejects.toThrow(unexpectedError);
		});
	});
});
