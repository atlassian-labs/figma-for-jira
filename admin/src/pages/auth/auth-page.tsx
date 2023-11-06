import Button from '@atlaskit/button';
import ArrowRightIcon from '@atlaskit/icon/glyph/arrow-right';
import UnlockFilledIcon from '@atlaskit/icon/glyph/unlock-filled';
import UserAvatarCircleIcon from '@atlaskit/icon/glyph/user-avatar-circle';
import { token } from '@atlaskit/tokens';
import { css } from '@emotion/react';

import { ConnectBanner, FigmaPermissionsPopup, Page } from '../../components';
import { useAuthenticate } from '../../hooks';

type AuthPageProps = {
	authorizationEndpoint: string;
};

export function AuthPage({ authorizationEndpoint }: AuthPageProps) {
	const authenticate = useAuthenticate(authorizationEndpoint);
	return (
		<Page>
			<div
				css={css`
					align-items: center;
					display: flex;
					flex-direction: column;
					gap: 24px;
				`}
			>
				<ConnectBanner />
				<div
					css={css`
						font-weight: 500;
						font-size: 24px;
						color: ${token('color.text')};
					`}
				>
					Connect Figma to Jira
				</div>
				<div css={css({ color: token('color.text.subtle') })}>
					Before you start, you should have:
				</div>
				<div
					css={css`
						background: ${token('elevation.surface.sunken')};
						display: flex;
						flex-direction: column;
						border-radius: 3px;
						padding: 16px;
						width: 368px;
						box-sizing: border-box;
						gap: 8px;
					`}
				>
					<div css={css({ display: 'flex', alignItems: 'center', gap: 8 })}>
						<UserAvatarCircleIcon
							label=""
							size="small"
							primaryColor={token('color.icon.subtle')}
						/>
						<span>A Figma account</span>
					</div>
					<div css={css({ display: 'flex', gap: 8 })}>
						<UnlockFilledIcon
							label=""
							size="small"
							primaryColor={token('color.icon.subtle')}
						/>
						<div
							css={css({
								display: 'flex',
								flexDirection: 'column',
							})}
						>
							<span>Admin permissions for a Figma team</span>
							<FigmaPermissionsPopup>
								How to check Figma permissions
							</FigmaPermissionsPopup>
						</div>
					</div>
				</div>
				<Button
					appearance="primary"
					onClick={authenticate}
					iconAfter={<ArrowRightIcon label="" size="medium" />}
				>
					Continue
				</Button>
			</div>
		</Page>
	);
}
