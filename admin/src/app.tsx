import Spinner from '@atlaskit/spinner';
import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';

import { checkAuth, getTeams } from './api';
import { getCurrentSite, getCurrentUser } from './api/connect_api';
import { Page } from './components';
import { ConnectedTeams } from './screens/connected-teams';
import { FigmaTeamConnector } from './screens/figma-team-connector';
import { PromptAuth } from './screens/prompt-auth';

export function App() {
	const [isConnectingTeam, setIsConnectingTeam] = useState(false);

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

	const currentSiteQuery = useQuery({
		queryKey: ['currentSite'],
		queryFn: getCurrentSite,
		initialData: '',
		placeholderData: '',
	});

	const teamsQuery = useQuery({
		queryKey: ['teams', currentUserQuery.data?.atlassianAccountId],
		queryFn: async () => {
			const teams = (await getTeams()).data;
			if (teams.length === 0) {
				setIsConnectingTeam(true);
			}
			return teams;
		},
		enabled: checkAuthQuery.data?.authorized ?? false,
	});

	if (
		currentUserQuery.isLoading ||
		checkAuthQuery.isPending ||
		teamsQuery.isLoading
	) {
		return (
			<Page>
				<Spinner size="large" />
			</Page>
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
	if (isConnectingTeam) {
		return (
			<FigmaTeamConnector
				site={currentSiteQuery.data}
				onClose={
					teams.length > 0 ? () => setIsConnectingTeam(false) : undefined
				}
				email={checkAuthResponse.email}
				authorizationEndpoint={checkAuthResponse.grant.authorizationEndpoint}
			/>
		);
	}

	return (
		<ConnectedTeams
			site={currentSiteQuery.data}
			teams={teams}
			addTeam={() => setIsConnectingTeam(true)}
		/>
	);
}
