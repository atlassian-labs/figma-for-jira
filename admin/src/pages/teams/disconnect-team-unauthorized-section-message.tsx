import SectionMessage from '@atlaskit/section-message';
import { css } from '@emotion/react';

import { FigmaPermissionsPopup } from '../../components';

export function DisconnectTeamUnauthorizedSectionMessage() {
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
