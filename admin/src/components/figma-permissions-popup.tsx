import Image from '@atlaskit/image';
import { Popup } from '@atlaskit/popup';
import { token } from '@atlaskit/tokens';
import { css } from '@emotion/react';
import { useState } from 'react';

type FigmaPermissionsPopupProps = {
	children: React.ReactNode;
};

export function FigmaPermissionsPopup({
	children,
}: FigmaPermissionsPopupProps) {
	const [isOpen, setIsOpen] = useState(false);

	return (
		<Popup
			isOpen={isOpen}
			onClose={() => setIsOpen(false)}
			placement="right-start"
			content={() => (
				<div
					css={css`
						padding: 16px;
						display: flex;
						flex-direction: column;
						gap: 16px;
						border-radius: 3px;
						background: ${token('elevation.surface.overlay')};
						width: 290px;
						box-sizing: border-box;
					`}
				>
					<div>
						To check your Figma permissions:
						<ol css={css({ paddingLeft: 18 })}>
							<li>
								Navigate to the <strong>Members</strong> tab in your Figma team.
							</li>
							<li>Your permissions level is next to your name.</li>
						</ol>
					</div>

					<Image src="/admin/figma-teams-ui.svg" />
				</div>
			)}
			trigger={(triggerProps) => (
				<a
					{...triggerProps}
					href="#"
					onMouseOver={() => setIsOpen(true)}
					onMouseOut={() => setIsOpen(false)}
				>
					{children}
				</a>
			)}
		/>
	);
}
