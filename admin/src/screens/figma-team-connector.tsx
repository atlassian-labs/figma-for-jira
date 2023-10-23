import Button from '@atlaskit/button';
import LoadingButton from '@atlaskit/button/loading-button';
import Form, { ErrorMessage, Field, FormFooter } from '@atlaskit/form';
import CloseIcon from '@atlaskit/icon/glyph/editor/close';
import Image from '@atlaskit/image';
import SectionMessage from '@atlaskit/section-message';
import TextField from '@atlaskit/textfield';
import { token } from '@atlaskit/tokens';
import { css } from '@emotion/react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';

import { connectTeam } from '../api';
import {
	ConnectBanner,
	FigmaPermissionsPopup,
	Link,
	Page,
} from '../components';
import { parseTeamIdFromFigmaUrl } from '../utils';

type ConnectTeamProps = {
	onClose?: () => void;
	site: string;
	email: string;
	authorizationEndpoint: string;
};

export function FigmaTeamConnector({
	onClose,
	site,
	email,
	authorizationEndpoint,
}: ConnectTeamProps) {
	const queryClient = useQueryClient();
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
					<ConnectBanner type="sync" />
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
					Logged in as <strong>{email}</strong>.{' '}
					<Link href={authorizationEndpoint}>Change Figma account</Link>
				</div>
			</div>
		);
	}

	return (
		<Page>
			{content}
			{onClose && <CloseButton onClick={onClose} />}
		</Page>
	);
}

type CloseButtonProps = {
	onClick: () => void;
};

function CloseButton({ onClick }: CloseButtonProps) {
	return (
		<div
			css={css`
				position: absolute;
				top: 32px;
				right: 32px;
			`}
		>
			<Button
				appearance="subtle"
				onClick={onClick}
				iconBefore={<CloseIcon label="" />}
			/>
		</div>
	);
}

type ConnectTeamSuccessScreenProps = {
	teamName: string;
	onClose: (() => void) | undefined;
};

function ConnectTeamSuccessScreen({
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
				<ConnectBanner type="success" />
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
				<Image src="/admin/figma-jira-ui.svg" />
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
