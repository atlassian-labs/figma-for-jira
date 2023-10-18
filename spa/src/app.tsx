import Button from '@atlaskit/button';
import ArrowRightIcon from '@atlaskit/icon/glyph/arrow-right';
import Spinner from '@atlaskit/spinner';
import { useQuery } from '@tanstack/react-query';
import React from 'react';

import { checkAuth, getTeams } from './api';
import { getCurrentUser } from './api/connect_api';
import { popup } from './utils';

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
		const { authorizationEndpoint } = checkAuthResponse.grant;
		return (
			<div className="w-screen h-screen flex items-center justify-center">
				<div className="flex flex-col">
					<h1>Connect Figma to Jira</h1>
					<p>Before you start, you should have:</p>
					<div></div>
					<Button
						appearance="primary"
						onClick={() => popup(authorizationEndpoint)}
						iconAfter={<ArrowRightIcon label="" size="medium" />}
					>
						Continue
					</Button>
				</div>
			</div>
		);
	}

	if (teamsQuery.isError || teamsQuery.isPending) {
		// TODO: render an error if we can't fetch teams but the user is authorized
		return null;
	}

	const teams = teamsQuery.data;
	if (teams.length === 0) {
		// TODO: render a screen that tells the user to add a team
		return null;
	}

	// TODO: render a screen listing all the teams the user has configured
	return <div>Hello, world!</div>;
}
