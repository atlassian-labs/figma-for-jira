import Spinner from '@atlaskit/spinner';
import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';

import { getTeams } from '../../api';
import { Page } from '../../components';

export function TeamsPage() {
	const [isConnectingTeam, setIsConnectingTeam] = useState(false);

	const teamsQuery = useQuery({
		queryKey: ['teams'],
		queryFn: async () => {
			const teams = (await getTeams()).data;
			if (teams.length === 0) {
				setIsConnectingTeam(true);
			}
			return teams;
		},
	});

	if (teamsQuery.isPending) {
		return (
			<Page>
				<Spinner size="large" />
			</Page>
		);
	}

	if (teamsQuery.isError) {
		// TODO: render an error if we can't fetch teams
		return null;
	}

	if (isConnectingTeam) {
		// TODO: render a page for connecting a team
		return <Page>Connect a team placeholder</Page>;
	}

	// TODO: render a page for displaying a list of connected teams
	return <Page>Connected teams placeholder</Page>;
}
