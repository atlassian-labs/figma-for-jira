import type { ConnectUserInfo } from './connect-user-info';

export enum FigmaTeamAuthStatus {
	OK = 'OK',
	ERROR = 'ERROR',
}

export class FigmaTeam {
	readonly #adminInfo: ConnectUserInfo;
	readonly id: string;
	readonly webhookId: string;
	readonly webhookPasscode: string;
	readonly teamId: string;
	readonly teamName: string;
	readonly figmaAdminAtlassianUserId: string;
	readonly authStatus: FigmaTeamAuthStatus;
	readonly connectInstallationId: string;

	constructor(params: {
		id: string;
		webhookId: string;
		webhookPasscode: string;
		teamId: string;
		teamName: string;
		figmaAdminAtlassianUserId: string;
		authStatus: FigmaTeamAuthStatus;
		connectInstallationId: string;
	}) {
		this.id = params.id;
		this.webhookId = params.webhookId;
		this.webhookPasscode = params.webhookPasscode;
		this.teamId = params.teamId;
		this.teamName = params.teamName;
		this.figmaAdminAtlassianUserId = params.figmaAdminAtlassianUserId;
		this.authStatus = params.authStatus;
		this.connectInstallationId = params.connectInstallationId;

		this.#adminInfo = {
			atlassianUserId: this.figmaAdminAtlassianUserId,
			connectInstallationId: this.connectInstallationId,
		};
	}

	get adminInfo() {
		return this.#adminInfo;
	}
}

export type FigmaTeamCreateParams = {
	readonly webhookId: string;
	readonly webhookPasscode: string;
	readonly teamId: string;
	readonly teamName: string;
	readonly figmaAdminAtlassianUserId: string;
	readonly authStatus: FigmaTeamAuthStatus;
	readonly connectInstallationId: string;
};

export type FigmaTeamSummary = Pick<
	FigmaTeam,
	'teamId' | 'teamName' | 'authStatus'
>;
