import Button from '@atlaskit/button';
import AddIcon from '@atlaskit/icon/glyph/add';
import SectionMessage from '@atlaskit/section-message';
import { token } from '@atlaskit/tokens';
import { css } from '@emotion/react';
import { useMutation, useQueryClient } from '@tanstack/react-query';

import { ConnectedTeam } from './connected-team';

import { connectTeam, disconnectTeam, type FigmaTeamSummary } from '../../api';
import { FigmaPermissionsPopup, Page, SuccessBanner } from '../../components';
import { pluralize } from '../../utils';

type ConnectedTeamsListProps = {
	teams: readonly FigmaTeamSummary[];
	addTeam: () => void;
	site: string;
};

export function ConnectedTeamsList({
	teams,
	addTeam,
	site,
}: ConnectedTeamsListProps) {
	const queryClient = useQueryClient();
	const disconnectMutation = useMutation({
		mutationFn: (teamId: string) => {
			return disconnectTeam(teamId);
		},
		onSuccess: () => {
			return queryClient.invalidateQueries({ queryKey: ['teams'] });
		},
	});

	const reconnectMutation = useMutation({
		mutationFn: (teamId: string) => {
			return connectTeam(teamId);
		},
		onSuccess: () => {
			return queryClient.invalidateQueries({ queryKey: ['teams'] });
		},
	});

	return (
		<Page>
			<div
				css={css`
					display: flex;
					flex-direction: column;
					align-items: center;
					gap: 32px;
					width: 580px;
				`}
			>
				<div
					css={css`
						display: flex;
						flex-direction: column;
						align-items: center;
						gap: 8px;
					`}
				>
					<SuccessBanner size="small" />
					<div
						css={css`
							color: ${token('color.text')};
							font-size: 24px;
							font-weight: 500;
						`}
					>
						Connected Figma teams
					</div>
				</div>
				<div
					css={css`
						color: ${token('color.text.subtle')};
					`}
				>
					You have {teams.length} Figma{' '}
					{pluralize(teams.length, 'team', 'teams')} connected to{' '}
					<strong>{site}</strong>
				</div>
				{disconnectMutation.isError && (
					<DisconnectTeamUnauthorizedSectionMessage />
				)}
				{reconnectMutation.isError && <GenericErrorSectionMessage />}
				<div
					css={css({
						padding: '32px 40px',
						borderWidth: 2,
						borderColor: token('color.border'),
						borderStyle: 'solid',
						borderRadius: 3,
						display: 'flex',
						flexDirection: 'column',
						alignSelf: 'stretch',
					})}
				>
					{teams.map((team) => (
						<ConnectedTeam
							key={team.teamId}
							team={team}
							disconnectTeam={disconnectMutation.mutate}
							reconnectTeam={reconnectMutation.mutate}
						/>
					))}
					<div
						css={css`
							display: flex;
							padding: 12px 16px;
							align-items: center;
							gap: 12px;
						`}
					>
						<Button
							onClick={addTeam}
							iconBefore={<AddIcon size="medium" label="" />}
						></Button>
						<span
							css={css`
								flex-grow: 1;
								font-weight: 500;
							`}
						>
							Add another team
						</span>
					</div>
				</div>
			</div>
		</Page>
	);
}

function DisconnectTeamUnauthorizedSectionMessage() {
	return (
		<SectionMessage css={css({ width: '100%' })} appearance="error">
			You must be an admin of your Figma team to remove a connected team.{' '}
			<FigmaPermissionsPopup>
				Check your Figma permissions
			</FigmaPermissionsPopup>{' '}
			and try again.
		</SectionMessage>
	);
}

function GenericErrorSectionMessage() {
	return (
		<SectionMessage css={css({ width: '100%' })} appearance="error">
			Something went wrong.{' '}
			<FigmaPermissionsPopup>
				Check your Figma permissions
			</FigmaPermissionsPopup>{' '}
			and try again.
		</SectionMessage>
	);
}
