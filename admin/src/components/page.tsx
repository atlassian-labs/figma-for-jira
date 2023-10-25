import Button from '@atlaskit/button';
import CloseIcon from '@atlaskit/icon/glyph/editor/close';
import { css } from '@emotion/react';

type PageProps = {
	children: React.ReactNode;
};

export function Page({ children }: PageProps) {
	return (
		<div
			css={css`
				position: relative;
				align-items: center;
				display: flex;
				height: 100vh;
				justify-content: center;
				width: 100vw;
			`}
		>
			{children}
		</div>
	);
}

type CloseButtonProps = {
	onClick: () => void;
};

function CloseButton({ onClick }: CloseButtonProps) {
	return (
		<div
			css={css`
				position: absolute;
				top: 32px;
				right: 32px;
			`}
		>
			<Button
				appearance="subtle"
				onClick={onClick}
				iconBefore={<CloseIcon label="" />}
			/>
		</div>
	);
}

Page.CloseButton = CloseButton;
