export enum FigmaTeamAuthStatus {
	OK = 'OK',
	ERROR = 'ERROR',
}

export type FigmaTeam = {
	readonly id: bigint;
	readonly webhookId: string;
	readonly teamId: string;
	readonly teamName: string;
	readonly figmaAdminAtlassianUserId: string;
	readonly authStatus: FigmaTeamAuthStatus;
	readonly connectInstallationId: bigint;
};

export type FigmaTeamCreateParams = Omit<FigmaTeam, 'id'>;
