import Button from '@atlaskit/button';
import AddIcon from '@atlaskit/icon/glyph/add';
import WarningIcon from '@atlaskit/icon/glyph/warning';
import Modal, {
	ModalBody,
	ModalFooter,
	ModalHeader,
	ModalTitle,
	ModalTransition,
} from '@atlaskit/modal-dialog';
import SectionMessage from '@atlaskit/section-message';
import { token } from '@atlaskit/tokens';
import Tooltip from '@atlaskit/tooltip';
import { css } from '@emotion/react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';

import {
	connectTeam,
	disconnectTeam,
	FigmaTeamAuthStatus,
	type FigmaTeamSummary,
} from '../api';
import {
	ConnectBanner,
	FigmaPermissionsPopup,
	Link,
	Page,
} from '../components';
import { pluralize } from '../utils';

function DisconnectTeamUnauthorizedSectionMessage() {
	return (
		<SectionMessage css={css({ width: '100%' })} appearance="error">
			You must be an admin of your Figma team to remove a connected team.{' '}
			<FigmaPermissionsPopup>
				Check your Figma permissions
			</FigmaPermissionsPopup>{' '}
			and try again.
		</SectionMessage>
	);
}

function GenericErrorSectionMessage() {
	return (
		<SectionMessage css={css({ width: '100%' })} appearance="error">
			Something went wrong.{' '}
			<FigmaPermissionsPopup>
				Check your Figma permissions
			</FigmaPermissionsPopup>{' '}
			and try again.
		</SectionMessage>
	);
}

type ConnectedTeamsProps = {
	teams: readonly FigmaTeamSummary[];
	addTeam: () => void;
	site: string;
};

export function ConnectedTeams({ teams, addTeam, site }: ConnectedTeamsProps) {
	const queryClient = useQueryClient();
	const disconnectMutation = useMutation({
		mutationFn: (teamId: string) => {
			return disconnectTeam(teamId);
		},
		onSuccess: () => {
			return queryClient.invalidateQueries({ queryKey: ['teams'] });
		},
	});

	const reconnectMutation = useMutation({
		mutationFn: (teamId: string) => {
			return connectTeam(teamId);
		},
		onSuccess: () => {
			return queryClient.invalidateQueries({ queryKey: ['teams'] });
		},
	});

	return (
		<Page>
			<div
				css={css`
					display: flex;
					flex-direction: column;
					align-items: center;
					gap: 32px;
					width: 580px;
				`}
			>
				<div
					css={css`
						display: flex;
						flex-direction: column;
						align-items: center;
						gap: 8px;
					`}
				>
					<ConnectBanner type="success" size="small" />
					<div
						css={css`
							color: ${token('color.text')};
							font-size: 24px;
							font-weight: 500;
						`}
					>
						Connected Figma teams
					</div>
				</div>
				<div
					css={css`
						color: ${token('color.text.subtle')};
					`}
				>
					You have {teams.length} Figma{' '}
					{pluralize(teams.length, 'team', 'teams')} connected to{' '}
					<strong>{site}</strong>
				</div>
				{disconnectMutation.isError && (
					<DisconnectTeamUnauthorizedSectionMessage />
				)}
				{reconnectMutation.isError && <GenericErrorSectionMessage />}
				<div
					css={css({
						padding: '32px 40px',
						borderWidth: 2,
						borderColor: token('color.border'),
						borderStyle: 'solid',
						borderRadius: 3,
						display: 'flex',
						flexDirection: 'column',
						alignSelf: 'stretch',
					})}
				>
					{teams.map((team) => (
						<ConnectedTeam
							key={team.teamId}
							team={team}
							disconnectTeam={disconnectMutation.mutate}
							reconnectTeam={reconnectMutation.mutate}
						/>
					))}
					<div
						css={css`
							display: flex;
							padding: 12px 16px;
							align-items: center;
							gap: 12px;
						`}
					>
						<Button
							onClick={addTeam}
							iconBefore={<AddIcon size="medium" label="" />}
						></Button>
						<span
							css={css`
								flex-grow: 1;
								font-weight: 500;
							`}
						>
							Add another team
						</span>
					</div>
				</div>
			</div>
		</Page>
	);
}

type ConnectedTeamProps = {
	team: FigmaTeamSummary;
	disconnectTeam: (teamId: string) => void;
	reconnectTeam: (teamId: string) => void;
};

function ConnectedTeam({
	team,
	disconnectTeam,
	reconnectTeam,
}: ConnectedTeamProps) {
	const [isReconnectModalOpen, setIsReconnectModalOpen] = useState(false);

	const openReconnectModal = () => {
		setIsReconnectModalOpen(true);
	};

	switch (team.authStatus) {
		case FigmaTeamAuthStatus.OK: {
			return (
				<div
					css={css`
						display: flex;
						padding: 12px 16px;
						align-items: center;
						gap: 12px;
					`}
				>
					<span
						css={css`
							flex-grow: 1;
							font-weight: 500;
						`}
					>
						{team.teamName}
					</span>
					<Button onClick={() => disconnectTeam(team.teamId)}>
						Disconnect
					</Button>
				</div>
			);
		}

		case FigmaTeamAuthStatus.ERROR: {
			return (
				<div
					css={css`
						display: flex;
						padding: 12px 16px;
						align-items: center;
						gap: 12px;
					`}
				>
					<div
						css={css`
							flex-grow: 1;
							display: flex;
							flex-direction: column;
							gap: 2px;
						`}
					>
						<span
							css={css`
								font-weight: 500;
							`}
						>
							{team.teamName}
						</span>
						<span
							css={css`
								display: flex;
								gap: 8px;
								color: ${token('color.text.subtlest')};
							`}
						>
							Not syncing to Jira.{' '}
							<Link onClick={openReconnectModal}>Troubleshoot</Link>
						</span>
					</div>
					<Tooltip content="We can't sync this Figma team">
						<Button
							onClick={openReconnectModal}
							iconBefore={
								<WarningIcon
									primaryColor={token('color.icon.warning')}
									label=""
								/>
							}
						/>
					</Tooltip>
					<ModalTransition>
						{isReconnectModalOpen && (
							<Modal onClose={() => setIsReconnectModalOpen(false)}>
								<ModalHeader>
									<ModalTitle>We can't sync this Figma team</ModalTitle>
								</ModalHeader>
								<ModalBody>
									<p>
										We can’t sync the <strong>{team.teamName}</strong> Figma
										team because we can’t access your account. Someone may have
										revoked access, or something went wrong.
									</p>
									<p>
										Reconnect your team to resume syncing (you must have team
										admin permissions in Figma) or disconnect the team to remove
										it from Jira.
									</p>
								</ModalBody>
								<ModalFooter>
									<Button
										appearance="subtle"
										onClick={() => {
											disconnectTeam(team.teamId);
											setIsReconnectModalOpen(false);
										}}
									>
										Disconnect team
									</Button>
									<Button
										appearance="primary"
										onClick={() => {
											reconnectTeam(team.teamId);
											setIsReconnectModalOpen(false);
										}}
									>
										Reconnect team
									</Button>
								</ModalFooter>
							</Modal>
						)}
					</ModalTransition>
				</div>
			);
		}
	}
}
