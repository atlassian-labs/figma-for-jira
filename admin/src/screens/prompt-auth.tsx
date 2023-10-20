import Button from '@atlaskit/button';
import ArrowRightIcon from '@atlaskit/icon/glyph/arrow-right';
import UnlockFilledIcon from '@atlaskit/icon/glyph/unlock-filled';
import UserAvatarCircleIcon from '@atlaskit/icon/glyph/user-avatar-circle';
import { token } from '@atlaskit/tokens';
import { css } from '@emotion/react';

import { ConnectBanner, FigmaPermissionsPopup } from '../components';
import { openInBrowser } from '../utils';

type PromptAuthProps = {
	authorizationEndpoint: string;
};

export function PromptAuth({ authorizationEndpoint }: PromptAuthProps) {
	return (
		<div
			css={css({
				width: '100vw',
				height: '100vh',
				display: 'flex',
				alignItems: 'center',
				justifyContent: 'center',
			})}
		>
			<div
				css={css({
					alignItems: 'center',
					display: 'flex',
					flexDirection: 'column',
					gap: 24,
				})}
			>
				<ConnectBanner />
				<div
					css={css({
						fontWeight: 'medium',
						fontSize: 24,
						color: token('color.text'),
					})}
				>
					Connect Figma to Jira
				</div>
				<div css={css({ color: token('color.text.subtle') })}>
					Before you start, you should have:
				</div>
				<div
					css={css({
						backgroundColor: token('elevation.surface.sunken'),
						display: 'flex',
						flexDirection: 'column',
						borderRadius: 3,
						padding: 16,
						width: 368,
						boxSizing: 'border-box',
						gap: 8,
					})}
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
					onClick={() => openInBrowser(authorizationEndpoint)}
					iconAfter={<ArrowRightIcon label="" size="medium" />}
				>
					Continue
				</Button>
			</div>
		</div>
	);
}
