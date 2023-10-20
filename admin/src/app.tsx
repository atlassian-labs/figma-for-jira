import Spinner from '@atlaskit/spinner';
import { useQuery } from '@tanstack/react-query';

import { checkAuth, getTeams } from './api';
import { getCurrentUser } from './api/connect_api';
import { ConnectTeam } from './screens/connect-team';
import { PromptAuth } from './screens/prompt-auth';

export function App() {
	const currentUserQuery = useQuery({
		queryKey: ['currentUser'],
		queryFn: getCurrentUser,
	});

	const atlassianAccountId = currentUserQuery.data?.atlassianAccountId;

	const checkAuthQuery = useQuery({
		queryKey: ['checkAuth', currentUserQuery.data?.atlassianAccountId],
		queryFn: async () => {
			return (await checkAuth(atlassianAccountId ?? '')).data;
		},
		enabled: atlassianAccountId != null,
	});

	const teamsQuery = useQuery({
		queryKey: ['teams', currentUserQuery.data?.atlassianAccountId],
		queryFn: async () => {
			return (await getTeams()).data;
		},
		enabled: checkAuthQuery.data?.authorized ?? false,
	});

	if (
		currentUserQuery.isLoading ||
		checkAuthQuery.isPending ||
		teamsQuery.isLoading
	) {
		return (
			<div className="w-screen h-screen flex items-center justify-center">
				<Spinner size="large" />
			</div>
		);
	}

	if (currentUserQuery.isError) {
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
			<PromptAuth
				authorizationEndpoint={checkAuthResponse.grant.authorizationEndpoint}
			/>
		);
	}

	if (teamsQuery.isError || teamsQuery.isPending) {
		// TODO: render an error if we can't fetch teams but the user is authorized
		return null;
	}

	const teams = teamsQuery.data;
	if (teams.length === 0) {
		return <ConnectTeam />;
	}

	// TODO: render a screen listing all the teams the user has configured
	return <div>Hello, world!</div>;
}
