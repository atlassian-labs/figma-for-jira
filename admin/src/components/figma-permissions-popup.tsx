import { css } from '@emotion/react';

import { FigmaPopup } from './figma-popup';
import { getAppPath } from '../utils';

type FigmaPermissionsPopupProps = {
	children: React.ReactNode;
};

export function FigmaPermissionsPopup({
	children,
}: FigmaPermissionsPopupProps) {
	const content = (
		<>
			To check your Figma permissions:
			<ol css={css({ paddingLeft: 18 })}>
				<li>
					Navigate to the <strong>Members</strong> tab in your Figma team.
				</li>
				<li>Your permissions level is next to your name.</li>
			</ol>
		</>
	);
	return (
		<FigmaPopup
			content={content}
			imageSrc={getAppPath('/static/admin/figma-teams-ui.svg')}
			children={children}
		/>
	);
}
