import type {
	ConfigureFigmaTeamRequestBody,
	RemoveFigmaTeamQueryParams,
} from './types';

import type { JSONSchemaTypeWithId } from '../../../infrastructure';

export const CONFIGURE_FIGMA_TEAMS_REQUEST_BODY: JSONSchemaTypeWithId<ConfigureFigmaTeamRequestBody> =
	{
		$id: 'figma-for-jira:configure-figma-teams-request-body',
		type: 'object',
		properties: {
			teamId: { type: 'string' },
		},
		required: ['teamId'],
	};

export const REMOVE_FIGMA_TEAM_QUERY_PARAMS_SCHEMA: JSONSchemaTypeWithId<RemoveFigmaTeamQueryParams> =
	{
		$id: 'figma-for-jira:remove-figma-team-request-query-params',
		type: 'object',
		properties: {
			teamId: { type: 'string' },
		},
		required: ['teamId'],
	};
