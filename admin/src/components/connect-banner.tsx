import Image from '@atlaskit/image';
import { css } from '@emotion/react';
import { getAppPath } from '../utils';

export function ConnectBanner() {
	return (
		<div
			css={css`
				display: flex;
				align-items: center;
			`}
		>
			<div css={css({ padding: 16 })}>
				<Image src={getAppPath('/static/admin/jira-logo.svg')} />
			</div>
			<Image src={getAppPath('/static/admin/sync.svg')} />
			<div css={css({ padding: 16 })}>
				<Image src={getAppPath('/static/admin/figma-logo.svg')} />
			</div>
		</div>
	);
}
