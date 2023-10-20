import LoadingButton from '@atlaskit/button/loading-button';
import Form, { ErrorMessage, Field, FormFooter } from '@atlaskit/form';
import SectionMessage from '@atlaskit/section-message';
import TextField from '@atlaskit/textfield';
import { token } from '@atlaskit/tokens';
import { css } from '@emotion/react';
import { useMutation } from '@tanstack/react-query';
import { useState } from 'react';

import { connectTeam } from '../api';
import { ConnectBanner, FigmaPermissionsPopup } from '../components';
import { parseTeamIdFromFigmaUrl } from '../utils';

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

export function ConnectTeam() {
	const [validationError, setValidationError] = useState<string | null>(null);
	const connectTeamMutation = useMutation({
		mutationFn: async (teamId: string) => {
			return await connectTeam(teamId);
		},
	});

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
					display: 'flex',
					flexDirection: 'column',
					gap: 32,
					alignItems: 'center',
					width: 580,
				})}
			>
				<div
					css={css({
						display: 'flex',
						flexDirection: 'column',
						gap: 8,
						alignItems: 'center',
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
				</div>
				{connectTeamMutation.isError && (
					<ConnectTeamUnauthorizedSectionMessage />
				)}
				<div
					css={css({
						padding: '32px 80px',
						borderWidth: 2,
						borderColor: token('color.border'),
						borderStyle: 'solid',
						borderRadius: 3,
						gap: 16,
						display: 'flex',
						flexDirection: 'column',
					})}
				>
					<span
						css={css({
							fontSize: 16,
							fontWeight: '400',
						})}
					>
						Enter a Figma team
					</span>
					<span
						css={css({
							fontSize: 14,
							color: token('color.text.subtle'),
						})}
					>
						Design updates from this team will be available to all projects in{' '}
						<strong>{'<site_name>'}</strong>
					</span>
					<Form<{ teamUrl: string }>
						onSubmit={({ teamUrl }) => {
							console.log(teamUrl);
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
					Logged in as <strong>{'<user_name>'}</strong>.{' '}
					<a>Change Figma account</a>
				</div>
			</div>
		</div>
	);
}
