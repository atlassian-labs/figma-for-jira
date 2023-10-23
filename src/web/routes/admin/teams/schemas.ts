import type {
	ConnectFigmaTeamRouteParams,
	DisconnectFigmaTeamRouteParams,
} from './types';

import type { JSONSchemaTypeWithId } from '../../../../infrastructure';

export const CONNECT_FIGMA_TEAM_ROUTE_PARAMS_SCHEMA: JSONSchemaTypeWithId<ConnectFigmaTeamRouteParams> =
	{
		$id: 'figma-for-jira:connect-figma-team-route-params',
		type: 'object',
		properties: {
			teamId: { type: 'string' },
		},
		required: ['teamId'],
	};

export const DISCONNECT_FIGMA_TEAM_ROUTE_PARAMS_SCHEMA: JSONSchemaTypeWithId<DisconnectFigmaTeamRouteParams> =
	{
		$id: 'figma-for-jira:disconnect-figma-team-request-route-params',
		type: 'object',
		properties: {
			teamId: { type: 'string' },
		},
		required: ['teamId'],
	};
