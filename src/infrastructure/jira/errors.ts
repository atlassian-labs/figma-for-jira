import type { AtlassianDesignAssociation } from '../../domain/entities';

export class JiraServiceError extends Error {}

export class JiraServiceSubmitDesignError extends JiraServiceError {
	designId?: string;
	rejectionErrors?: { readonly message: string }[];
	unknownIssueKeys?: string[];
	unknownAssociations?: AtlassianDesignAssociation[];

	private constructor({
		message,
		designId,
		rejectionErrors,
		unknownIssueKeys,
		unknownAssociations,
	}: {
		message: string;
		designId?: string;
		rejectionErrors?: { readonly message: string }[];
		unknownIssueKeys?: string[];
		unknownAssociations?: AtlassianDesignAssociation[];
	}) {
		super(message);
		this.designId = designId;
		this.rejectionErrors = rejectionErrors;
		this.unknownIssueKeys = unknownIssueKeys;
		this.unknownAssociations = unknownAssociations;
	}

	static designRejected(
		designId: string,
		rejectionErrors: { readonly message: string }[],
	): JiraServiceSubmitDesignError {
		return new JiraServiceSubmitDesignError({
			message: 'The design submission has been rejected',
			designId,
			rejectionErrors,
		});
	}

	static unknownIssueKeys(unknownIssueKeys: string[]) {
		return new JiraServiceSubmitDesignError({
			message: 'The design has unknown issue keys',
			unknownIssueKeys,
		});
	}

	static unknownAssociations(
		unknownAssociations: AtlassianDesignAssociation[],
	) {
		return new JiraServiceSubmitDesignError({
			message: 'The design has unknown associations',
			unknownAssociations,
		});
	}
}
