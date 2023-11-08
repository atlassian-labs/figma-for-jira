import Image from '@atlaskit/image';
import { Popup } from '@atlaskit/popup';
import { token } from '@atlaskit/tokens';
import { css } from '@emotion/react';
import { useState } from 'react';

type FigmaPopup = {
	content: React.ReactNode;
	imageSrc: string;
	children: React.ReactNode;
};

export function FigmaPopup({ content, imageSrc, children }: FigmaPopup) {
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
					{content}

					<Image src={imageSrc} />
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
