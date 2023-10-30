import Button, { LoadingButton } from '@atlaskit/button';
import Modal, {
	ModalBody,
	ModalFooter,
	ModalHeader,
	ModalTitle,
} from '@atlaskit/modal-dialog';

import type { FigmaTeamSummary } from '../../api';

type DisconnectTeamWarningModalProps = {
	team: FigmaTeamSummary;
	onClose: () => void;
	disconnectTeam: (teamId: string) => void;
	isDisconnectingTeam: boolean;
};

export function DisconnectTeamWarningModal({
	team,
	onClose,
	disconnectTeam,
	isDisconnectingTeam,
}: DisconnectTeamWarningModalProps) {
	return (
		<Modal onClose={onClose}>
			<ModalHeader>
				<ModalTitle appearance="warning">
					Disconnect Figma team from Jira
				</ModalTitle>
			</ModalHeader>
			<ModalBody>
				Are you sure you want to disconnect <strong>{team.teamName}</strong>{' '}
				from Jira? Disconnecting means that you will no longer be able to see
				updates from this design team in Jira. You can still connect your team
				to Jira again later.
			</ModalBody>
			<ModalFooter>
				<Button appearance="subtle" onClick={onClose}>
					Cancel
				</Button>
				<LoadingButton
					appearance="warning"
					onClick={() => disconnectTeam(team.teamId)}
					isLoading={isDisconnectingTeam}
					autoFocus
				>
					Disconnect Figma team
				</LoadingButton>
			</ModalFooter>
		</Modal>
	);
}
