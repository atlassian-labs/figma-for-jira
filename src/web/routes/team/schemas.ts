import type { ConfigureFigmaTeamRequestBody } from './types';

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
