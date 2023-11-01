import { JIRA_ISSUE_ATI } from './jira-issue';

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

export class AtlassianAssociation {
	constructor(
		readonly associationType: string,
		readonly values: string[],
	) {}

	static createDesignIssueAssociation(issueAri: string): AtlassianAssociation {
		return new AtlassianAssociation(JIRA_ISSUE_ATI, [issueAri]);
	}
}

/**
 * An Atlassian representation of a Design from a provider.
 */
export type AtlassianDesign = {
	readonly id: string;
	readonly displayName: string;
	readonly url: string;
	readonly liveEmbedUrl: string;
	readonly inspectUrl?: string;
	readonly status: AtlassianDesignStatus;
	readonly type: AtlassianDesignType;
	readonly lastUpdated: string;
	readonly updateSequenceNumber: number;
};
