import Spinner from '@atlaskit/spinner';
import { useQuery } from '@tanstack/react-query';

import { checkAuth, getAtlassianAccountId } from './api';
import { Page } from './components';
import { AuthPage, TeamsPage } from './pages';

export function App() {
	const atlassianAccountIdQuery = useQuery({
		queryKey: ['atlassianAccountId'],
		queryFn: getAtlassianAccountId,
	});

	const atlassianAccountId = atlassianAccountIdQuery.data;

	const checkAuthQuery = useQuery({
		queryKey: ['checkAuth', atlassianAccountId],
		queryFn: async () => {
			return (await checkAuth(atlassianAccountId ?? '')).data;
		},
		enabled: atlassianAccountId != null,
	});

	if (atlassianAccountIdQuery.isPending || checkAuthQuery.isPending) {
		return (
			<Page>
				<Spinner size="large" />
			</Page>
		);
	}

	if (atlassianAccountIdQuery.isError) {
		// TODO: render an error. In this case the app is likely being used outside of Jira
		return null;
	}

	if (checkAuthQuery.isError) {
		// TODO: render an error screen when our service is down or unavailable
		return null;
	}

	const checkAuthResponse = checkAuthQuery.data;

	if (!checkAuthResponse.authorized) {
		return (
			<AuthPage
				authorizationEndpoint={checkAuthResponse.grant.authorizationEndpoint}
			/>
		);
	}

	return (
		<TeamsPage
			authorizationEndpoint={checkAuthResponse.grant.authorizationEndpoint}
			currentUser={checkAuthResponse.user}
		/>
	);
}
