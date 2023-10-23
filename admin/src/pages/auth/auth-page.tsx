import Button from '@atlaskit/button';
import ArrowRightIcon from '@atlaskit/icon/glyph/arrow-right';

import { Page } from '../../components';
import { openInBrowser } from '../../utils';

type AuthPageProps = {
	authorizationEndpoint: string;
};

export function AuthPage({ authorizationEndpoint }: AuthPageProps) {
	return (
		<Page>
			<Button
				appearance="primary"
				onClick={() => openInBrowser(authorizationEndpoint)}
				iconAfter={<ArrowRightIcon label="" size="medium" />}
			>
				Continue
			</Button>
		</Page>
	);
}
