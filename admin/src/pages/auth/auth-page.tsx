import Button from '@atlaskit/button';
import ArrowRightIcon from '@atlaskit/icon/glyph/arrow-right';
import UnlockFilledIcon from '@atlaskit/icon/glyph/unlock-filled';
import UserAvatarCircleIcon from '@atlaskit/icon/glyph/user-avatar-circle';
import { token } from '@atlaskit/tokens';
import { css } from '@emotion/react';
import Spinner from '@atlaskit/spinner';

import { ConnectBanner, FigmaPermissionsPopup, Page } from '../../components';
import { useAuthenticate } from '../../hooks';
import { useQuery } from '@tanstack/react-query';

type AuthPageProps = {
	authorizationEndpoint: string;
};

export function AuthPage({ authorizationEndpoint }: AuthPageProps) {
	const authenticate = useAuthenticate(authorizationEndpoint);
	const jwtQuery = useQuery({
		queryKey: ['jwt'],
		queryFn: async () => {
			return await AP.context.getToken();
		},
	});

	if (jwtQuery.isPending) {
		return (
			<Page>
				<Spinner size="large" />
			</Page>
		);
	}

	if (jwtQuery.isError) {
		// TODO: render an error if we can't fetch the JWT
		return null;
	}

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
							<span>Admin permissions for a paid Figma team</span>
							<FigmaPermissionsPopup>
								How to check Figma permissions
							</FigmaPermissionsPopup>
						</div>
					</div>
				</div>
				<form
					id="form-id"
					target="_blank"
					method="post"
					style={{ visibility: 'hidden' }}
					action={authorizationEndpoint}
				>
					<input
						type="hidden"
						id="jwt"
						name="jwt"
						value={jwtQuery.data}
						required
					></input>
				</form>

				<Button
					type="submit"
					appearance="primary"
					form="form-id"
					// onClick={authenticate}
					iconAfter={<ArrowRightIcon label="" size="medium" />}
				>
					Continue
				</Button>
			</div>
		</Page>
	);
}
