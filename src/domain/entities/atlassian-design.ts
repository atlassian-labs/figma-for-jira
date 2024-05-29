export enum AtlassianDesignStatus {
	READY_FOR_DEVELOPMENT = 'READY_FOR_DEVELOPMENT',
	UNKNOWN = 'UNKNOWN',
	NONE = 'NONE',
}

export enum AtlassianDesignType {
	FILE = 'FILE',
	CANVAS = 'CANVAS',
	GROUP = 'GROUP',
	NODE = 'NODE',
	PROTOTYPE = 'PROTOTYPE',
	OTHER = 'OTHER',
}

export interface AtlassianProviderUser {
	readonly id: string;
}

export class AtlassianAssociation {
	constructor(
		readonly associationType: string,
		readonly values: string[],
	) {}

	static createDesignIssueAssociation(issueAri: string): AtlassianAssociation {
		return new AtlassianAssociation('ati:cloud:jira:issue', [issueAri]);
	}
}

/**
 * An Atlassian representation of a Design from a provider.
 */
export type AtlassianDesign = {
	readonly id: string;
	/**
	 * The name of the design.
	 * Should not exceed 255 characters.
	 */
	readonly displayName: string;
	readonly url: string;
	readonly liveEmbedUrl: string;
	readonly inspectUrl?: string;
	readonly status: AtlassianDesignStatus;
	readonly type: AtlassianDesignType;
	readonly lastUpdated: string;
	readonly lastUpdatedBy?: AtlassianProviderUser;
	readonly iconUrl?: string;
	readonly updateSequenceNumber: number;
};
