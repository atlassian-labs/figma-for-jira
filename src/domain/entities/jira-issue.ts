export type JiraIssue = {
	readonly id: string;
	readonly key: string;
	readonly fields: {
		readonly summary: string;
	};
};
