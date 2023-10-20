import Image from '@atlaskit/image';
import { css } from '@emotion/react';

export function ConnectBanner() {
	return (
		<div
			css={css({
				display: 'flex',
				alignItems: 'center',
			})}
		>
			<div css={css({ padding: 16 })}>
				<Image src="/admin/jira-logo.svg" />
			</div>
			<Image src="/admin/sync.svg" />
			<div css={css({ padding: 16 })}>
				<Image src="/admin/figma-logo.svg" />
			</div>
		</div>
	);
}
