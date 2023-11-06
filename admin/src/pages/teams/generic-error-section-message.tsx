import SectionMessage from '@atlaskit/section-message';
import { css } from '@emotion/react';

import { FigmaPermissionsPopup } from '../../components';

export function GenericErrorSectionMessage() {
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
