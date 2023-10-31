import Spinner from '@atlaskit/spinner';
import { useQuery } from '@tanstack/react-query';

import { getAtlassianAccountId, getAuthMe } from './api';
import { Page } from './components';
import { AuthPage, TeamsPage } from './pages';

export function App() {
	const atlassianAccountIdQuery = useQuery({
		queryKey: ['atlassianAccountId'],
		queryFn: getAtlassianAccountId,
	});

	const atlassianAccountId = atlassianAccountIdQuery.data;

	const getAuthMeQuery = useQuery({
		queryKey: ['authMe', atlassianAccountId],
		queryFn: async () => {
			return (await getAuthMe(atlassianAccountId ?? '')).data;
		},
		enabled: atlassianAccountId != null,
	});

	if (atlassianAccountIdQuery.isPending || getAuthMeQuery.isPending) {
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

	if (getAuthMeQuery.isError) {
		// TODO: render an error screen when our service is down or unavailable
		return null;
	}

	const { authorizationEndpoint, user } = getAuthMeQuery.data;

	if (!user) {
		return <AuthPage authorizationEndpoint={authorizationEndpoint} />;
	}

	return (
		<TeamsPage
			authorizationEndpoint={authorizationEndpoint}
			currentUser={user}
		/>
	);
}
