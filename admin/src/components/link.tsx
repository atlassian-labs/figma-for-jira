import { css } from '@emotion/react';

import { openInBrowser } from '../utils';

type LinkProps = {
	href?: string;
	onClick?: () => void;
	children: React.ReactNode;
};

export function Link({ href, onClick, children }: LinkProps) {
	return (
		<a
			css={css({ cursor: 'pointer' })}
			onClick={() => {
				href && openInBrowser(href);
				onClick?.();
			}}
		>
			{children}
		</a>
	);
}
