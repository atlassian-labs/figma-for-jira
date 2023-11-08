import LoadingButton from '@atlaskit/button/loading-button';
import Form, { ErrorMessage, Field, FormFooter } from '@atlaskit/form';
import SectionMessage from '@atlaskit/section-message';
import TextField from '@atlaskit/textfield';
import { token } from '@atlaskit/tokens';
import { css } from '@emotion/react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';

import { ConnectTeamSuccessScreen } from './connect-teams-success-screen';

import type { FigmaUser } from '../../api';
import { connectTeam } from '../../api';
import {
	ConnectBanner,
	FigmaPermissionsPopup,
	Link,
	Page,
} from '../../components';
import { openInBrowser, parseTeamIdFromFigmaUrl } from '../../utils';

type ConnectTeamProps = {
	authorizationEndpoint: string;
	currentUser: FigmaUser;
	onClose?: () => void;
	site: string;
};

export function FigmaTeamConnector({
	authorizationEndpoint,
	currentUser,
	onClose,
	site,
}: ConnectTeamProps) {
	const queryClient = useQueryClient();
	const switchFigmaUser = () => {
		// Use URL API to handle encoding.
		const switchFigmaUserUrl = new URL('switch_user', 'https://www.figma.com');
		switchFigmaUserUrl.searchParams.set('cont', authorizationEndpoint);
		// Redirect a user to `switchFigmaUserUrl`.

		// We don't set up any logic for auto closing the window here since Figma
		// ends up setting `window.opener` to `null` when the user selects an account.
		openInBrowser(switchFigmaUserUrl.toString());
	};

	const [validationError, setValidationError] = useState<string | null>(null);
	const connectTeamMutation = useMutation({
		mutationFn: async (teamId: string) => {
			return (await connectTeam(teamId)).data;
		},
		onSuccess: () => {
			return queryClient.invalidateQueries({ queryKey: ['teams'] });
		},
	});

	let content: React.ReactNode = null;
	if (connectTeamMutation.isSuccess) {
		content = (
			<ConnectTeamSuccessScreen
				onClose={onClose}
				teamName={connectTeamMutation.data.teamName}
			/>
		);
	} else {
		content = (
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
					<ConnectBanner />
					<div
						css={css`
							color: ${token('color.text')};
							font-size: 24px;
							font-weight: 500;
						`}
					>
						Connect Figma to Jira
					</div>
				</div>
				{connectTeamMutation.isError && (
					<ConnectTeamUnauthorizedSectionMessage />
				)}
				<div
					css={css`
						border: 2px solid ${token('color.border')};
						border-radius: 3px;
						display: flex;
						flex-direction: column;
						gap: 16px;
						padding: 32px 80px;
					`}
				>
					<span
						css={css`
							font-size: 16px;
							font-weight: 600;
						`}
					>
						Enter a Figma team
					</span>
					<span
						css={css`
							color: ${token('color.text.subtle')};
							font-size: 14px;
						`}
					>
						Design updates from this team will be available to all projects in{' '}
						<strong>{site}</strong>
					</span>
					<Form<{ teamUrl: string }>
						onSubmit={({ teamUrl }) => {
							return connectTeamMutation.mutateAsync(
								parseTeamIdFromFigmaUrl(teamUrl),
							);
						}}
					>
						{({ formProps, submitting }) => (
							<form {...formProps} css={css({ marginTop: 0 })}>
								<Field
									name="teamUrl"
									defaultValue=""
									label="Figma team URL"
									validate={(value) => {
										try {
											value && parseTeamIdFromFigmaUrl(value);
											setValidationError(null);
										} catch (e) {
											setValidationError(
												e instanceof Error ? e.message : 'Invalid URL',
											);
											return value;
										}
									}}
								>
									{({ fieldProps }) => (
										<>
											<TextField
												{...fieldProps}
												placeholder="e.g. team.figma.com"
												width="100%"
												isInvalid={validationError != null}
											/>
											{validationError != null && (
												<ErrorMessage>{validationError}</ErrorMessage>
											)}
										</>
									)}
								</Field>
								<FormFooter align="start">
									<LoadingButton
										appearance="primary"
										isLoading={submitting}
										type="submit"
									>
										Connect
									</LoadingButton>
								</FormFooter>
							</form>
						)}
					</Form>
				</div>
				<div>
					Logged in as <strong>{currentUser.email}</strong>.{' '}
					<Link onClick={switchFigmaUser}>Change Figma account</Link>
				</div>
			</div>
		);
	}

	return (
		<Page>
			{content}
			{onClose && <Page.CloseButton onClick={onClose} />}
		</Page>
	);
}

function ConnectTeamUnauthorizedSectionMessage() {
	return (
		<SectionMessage css={css({ width: '100%' })} appearance="error">
			You do not have admin permissions for this team.{' '}
			<FigmaPermissionsPopup>
				Check your Figma permissions
			</FigmaPermissionsPopup>{' '}
			and try again.
		</SectionMessage>
	);
}
