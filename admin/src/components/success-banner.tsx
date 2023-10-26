import Image from '@atlaskit/image';
import { css } from '@emotion/react';

export function SuccessBanner() {
	return (
		<div
			css={css({
				display: 'flex',
				alignItems: 'center',
			})}
		>
			<div css={css({ padding: 16, paddingRight: 0 })}>
				<Image src="/static/admin/jira-logo.svg" width={64} />
			</div>
			<Image src="/static/admin/sync-success.svg" width={80} height={32} />
			<div css={css({ padding: 16, paddingLeft: 0 })}>
				<Image src="/static/admin/figma-logo.svg" width={64} />
			</div>
		</div>
	);
}
