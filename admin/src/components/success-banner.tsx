import Image from '@atlaskit/image';
import { css } from '@emotion/react';
import { getAppPath } from '../utils';

type SuccessBannerProps = {
	size?: 'small' | 'large';
};

export function SuccessBanner({ size = 'large' }: SuccessBannerProps) {
	const logoWidth = size === 'small' ? 32 : 64;
	const connectorWidth = size === 'small' ? 40 : 80;
	const connectorHeight = size === 'small' ? 16 : 32;
	const logoPadding = size === 'small' ? 8 : 16;

	return (
		<div
			css={css({
				display: 'flex',
				alignItems: 'center',
			})}
		>
			<div css={css({ padding: logoPadding, paddingRight: 0 })}>
				<Image src={getAppPath('/static/admin/jira-logo.svg')} width={logoWidth} />
			</div>
			<Image
				src={getAppPath('/static/admin/sync-success.svg')}
				width={connectorWidth}
				height={connectorHeight}
			/>
			<div css={css({ padding: logoPadding, paddingLeft: 0 })}>
				<Image src={getAppPath('/static/admin/figma-logo.svg')} width={logoWidth} />
			</div>
		</div>
	);
}
