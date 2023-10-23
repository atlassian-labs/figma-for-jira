import Image from '@atlaskit/image';
import { css } from '@emotion/react';

type ConnectBannerProps = {
	type: 'sync' | 'success';
	size?: 'small' | 'large';
};

export function ConnectBanner({ type, size = 'large' }: ConnectBannerProps) {
	switch (type) {
		case 'sync': {
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
		case 'success': {
			return (
				<div
					css={css({
						display: 'flex',
						alignItems: 'center',
					})}
				>
					<div
						css={css({ padding: size === 'small' ? 8 : 16, paddingRight: 0 })}
					>
						<Image
							src="/admin/jira-logo.svg"
							width={size === 'small' ? 32 : 64}
						/>
					</div>
					<Image
						src="/admin/sync-success.svg"
						width={size === 'small' ? 40 : 80}
						height={size === 'small' ? 16 : 32}
					/>
					<div
						css={css({ padding: size === 'small' ? 8 : 16, paddingLeft: 0 })}
					>
						<Image
							src="/admin/figma-logo.svg"
							width={size === 'small' ? 32 : 64}
						/>
					</div>
				</div>
			);
		}
	}
}
