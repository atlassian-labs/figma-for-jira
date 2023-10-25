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
