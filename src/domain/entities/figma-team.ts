import type { ConnectUserInfo } from './connect-user-info';

export enum FigmaTeamAuthStatus {
	OK = 'OK',
	ERROR = 'ERROR',
}

export class FigmaTeam {
	private readonly _adminInfo: ConnectUserInfo;

	constructor(
		readonly id: string,
		readonly webhookId: string,
		readonly webhookPasscode: string,
		readonly teamId: string,
		readonly teamName: string,
		readonly figmaAdminAtlassianUserId: string,
		readonly authStatus: FigmaTeamAuthStatus,
		readonly connectInstallationId: string,
	) {
		this._adminInfo = {
			atlassianUserId: this.figmaAdminAtlassianUserId,
			connectInstallationId: this.connectInstallationId,
		};
	}

	get adminInfo() {
		return this._adminInfo;
	}
}

export type FigmaTeamCreateParams = Omit<FigmaTeam, 'id' | 'adminInfo'>;

export type FigmaTeamSummary = Pick<
	FigmaTeam,
	'teamId' | 'teamName' | 'authStatus'
>;
