export enum FigmaTeamAuthStatus {
	OK = 'OK',
	ERROR = 'ERROR',
}

export type FigmaTeam = {
	readonly id: string;
	readonly webhookId: string;
	readonly webhookPasscode: string;
	readonly teamId: string;
	readonly teamName: string;
	readonly figmaAdminAtlassianUserId: string;
	readonly authStatus: FigmaTeamAuthStatus;
	readonly connectInstallationId: string;
};

export type FigmaTeamCreateParams = Omit<FigmaTeam, 'id'>;

export type FigmaTeamSummary = Pick<
	FigmaTeam,
	'teamId' | 'teamName' | 'authStatus'
>;
