import Spinner from '@atlaskit/spinner';
import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';

import { ConnectedTeamsList } from './connected-teams-list';
import { FigmaTeamConnector } from './figma-teams-connector';

import type { FigmaUser } from '../../api';
import { getCurrentAtlassianSite, getTeams } from '../../api';
import { Page } from '../../components';

type TeamsPageProps = {
	authorizationEndpoint: string;
	currentUser: FigmaUser;
};

export function TeamsPage({
	authorizationEndpoint,
	currentUser,
}: TeamsPageProps) {
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

	const currentAtlassianSiteQuery = useQuery({
		queryKey: ['currentSite'],
		queryFn: getCurrentAtlassianSite,
		initialData: '',
		placeholderData: '',
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

	const teams = teamsQuery.data;
	const currentAtlassianSite = currentAtlassianSiteQuery.data;

	if (isConnectingTeam) {
		return (
			<FigmaTeamConnector
				authorizationEndpoint={authorizationEndpoint}
				currentUser={currentUser}
				site={currentAtlassianSite}
				onClose={
					teams.length > 0 ? () => setIsConnectingTeam(false) : undefined
				}
			/>
		);
	}

	return (
		<ConnectedTeamsList
			teams={teams}
			addTeam={() => setIsConnectingTeam(true)}
			site={currentAtlassianSite}
		/>
	);
}
