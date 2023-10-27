import Button from '@atlaskit/button';
import Image from '@atlaskit/image';
import { token } from '@atlaskit/tokens';
import { css } from '@emotion/react';

import { SuccessBanner } from '../../components';

type ConnectTeamSuccessScreenProps = {
	teamName: string;
	onClose: (() => void) | undefined;
};

export function ConnectTeamSuccessScreen({
	teamName,
	onClose,
}: ConnectTeamSuccessScreenProps) {
	return (
		<div
			css={css`
				align-items: center;
				display: flex;
				flex-direction: column;
				gap: 32px;
				width: 580px;
			`}
		>
			<div
				css={css`
					align-items: center;
					display: flex;
					flex-direction: column;
					gap: 8px;
				`}
			>
				<SuccessBanner />
				<div
					css={css`
						color: ${token('color.text')};
						font-size: 24px;
						font-weight: 500;
					`}
				>
					Figma is now connected!
				</div>
			</div>
			<div
				css={css`
					display: flex;
					width: 580px;
					padding: 32px 0px;
					flex-direction: column;
					align-items: center;
					gap: 24px;
					border-radius: 3px;
					background: ${token('elevation.surface.sunken')};
				`}
			>
				<Image src="/static/admin/figma-jira-ui.svg" />
				<div
					css={css`
						align-items: center;
						display: flex;
						flex-direction: column;
						gap: 8px;
						align-self: stretch;
					`}
				>
					<span
						css={css`
							color: ${token('color.text')};
							font-size: 16px;
							font-weight: 600;
						`}
					>
						It's time to let {teamName} know that Figma for Jira is connected
					</span>
					<span
						css={css`
							color: ${token('color.text.subtle')};
							font-size: 14px;
							font-weight: 400;
						`}
					>
						Your team can now see when a Figma design has been updated.
					</span>
				</div>
				<Button onClick={onClose} appearance="subtle">
					See connected teams
				</Button>
			</div>
			<Button onClick={onClose} appearance="subtle">
				Exit set up
			</Button>
		</div>
	);
}
