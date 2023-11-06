import { AutoDismissFlag } from '@atlaskit/flag';
import CheckCircleIcon from '@atlaskit/icon/glyph/check-circle';
import { token } from '@atlaskit/tokens';

type DisconnectedTeamFlagProps = {
	teamId: string;
	onClose: () => void;
	onUndo: () => void;
};

export function DisconnectedTeamFlag({
	teamId,
	onClose,
	onUndo,
}: DisconnectedTeamFlagProps) {
	return (
		<AutoDismissFlag
			id={teamId}
			icon={
				<CheckCircleIcon
					label=""
					primaryColor={token('color.icon.success')}
					size="medium"
				/>
			}
			title="Figma team disconnected"
			actions={[
				{ content: 'Got it', onClick: onClose },
				{ content: 'Undo', onClick: onUndo },
			]}
		/>
	);
}
