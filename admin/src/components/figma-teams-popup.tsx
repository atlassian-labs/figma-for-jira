import { css } from '@emotion/react';

import { FigmaPopup } from './figma-popup';

type FigmaTeamsPopupProps = {
	children: React.ReactNode;
};

export function FigmaTeamsPopup({ children }: FigmaTeamsPopupProps) {
	const content = (
		<>
			To find your Figma team URL:
			<ol css={css({ paddingLeft: 18 })}>
				<li>Navigate to your team page in Figma.</li>
				<li>
					Click on the down arrow next to your team name, and select{' '}
					<strong>Copy link</strong>.
				</li>
			</ol>
		</>
	);
	return (
		<FigmaPopup
			content={content}
			imageSrc={'/static/admin/figma-team-url.svg'}
			children={children}
		/>
	);
}
