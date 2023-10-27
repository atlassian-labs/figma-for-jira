import Button from '@atlaskit/button';
import WarningIcon from '@atlaskit/icon/glyph/warning';
import Modal, {
	ModalBody,
	ModalFooter,
	ModalHeader,
	ModalTitle,
	ModalTransition,
} from '@atlaskit/modal-dialog';
import { token } from '@atlaskit/tokens';
import Tooltip from '@atlaskit/tooltip';
import { css } from '@emotion/react';
import { useState } from 'react';

import { FigmaTeamAuthStatus, type FigmaTeamSummary } from '../../api';
import { Link } from '../../components';

type ConnectedTeamProps = {
	team: FigmaTeamSummary;
	disconnectTeam: (teamId: string) => void;
	reconnectTeam: (teamId: string) => void;
};

export function ConnectedTeam({
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
