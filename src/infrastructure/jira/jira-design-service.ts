import type { SubmitDesignsResponse } from './jira-client';
import { jiraClient } from './jira-client';

import { CauseAwareError } from '../../common/errors';
import type {
	AtlassianDesign,
	ConnectInstallation,
} from '../../domain/entities';

export type SubmitDesignParams = {
	readonly design: AtlassianDesign;
};

export class JiraDesignService {
	/**
	 * @throws {JiraSubmitDesignServiceError} Design submission fails.
	 */
	submitDesign = async (
		params: SubmitDesignParams,
		connectInstallation: ConnectInstallation,
	): Promise<void> => {
		return this.submitDesigns([params], connectInstallation);
	};

	/**
	 * @throws {JiraSubmitDesignServiceError} Design submission fails.
	 */
	submitDesigns = async (
		designs: SubmitDesignParams[],
		connectInstallation: ConnectInstallation,
	): Promise<void> => {
		const associationsLastUpdated = new Date();

		const response = await jiraClient.submitDesigns(
			{
				designs: designs.map(({ design }) => ({
					...design,
					addAssociations: null,
					removeAssociations: null,
					associationsLastUpdated: associationsLastUpdated.toISOString(),
					associationsUpdateSequenceNumber: associationsLastUpdated.valueOf(),
				})),
			},
			connectInstallation,
		);

		this.throwIfSubmitDesignResponseHasErrors(response);
	};

	/**
	 * @throws {JiraSubmitDesignServiceError}
	 */
	private throwIfSubmitDesignResponseHasErrors = (
		response: SubmitDesignsResponse,
	) => {
		if (response.rejectedEntities.length) {
			const { key, errors } = response.rejectedEntities[0];
			throw JiraSubmitDesignServiceError.designRejected(key.designId, errors);
		}
	};
}

export const jiraDesignService = new JiraDesignService();

export class JiraSubmitDesignServiceError extends CauseAwareError {
	designId?: string;
	rejectionErrors?: { readonly message: string }[];

	private constructor({
		message,
		designId,
		rejectionErrors,
	}: {
		message: string;
		designId?: string;
		rejectionErrors?: { readonly message: string }[];
	}) {
		super(message);
		this.designId = designId;
		this.rejectionErrors = rejectionErrors;
	}

	static designRejected(
		designId: string,
		rejectionErrors: { readonly message: string }[],
	): JiraSubmitDesignServiceError {
		return new JiraSubmitDesignServiceError({
			message: 'The design submission has been rejected',
			designId,
			rejectionErrors,
		});
	}
}
