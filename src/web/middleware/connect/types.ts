/* eslint-disable @typescript-eslint/no-unsafe-member-access,@typescript-eslint/no-unsafe-assignment,@typescript-eslint/no-unsafe-argument,@typescript-eslint/no-unsafe-call */

export type ConnectJwtTokenClaims = {
	readonly iss: string;
	readonly iat: number;
	readonly exp: number;
	readonly qsh: string;
	readonly sub?: string;
	readonly aud?: string | string[];
};
