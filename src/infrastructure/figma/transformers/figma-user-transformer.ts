import type {
	AtlassianProviderUser,
	FigmaUser,
} from '../../../domain/entities';

type TransformFigmaUserToAtlassianUserParams = {
	readonly figmaUser: FigmaUser;
};

/**
 * Transforms a Figma user  to {@link AtlassianProviderUser}.
 */
export const transformFigmaUserToAtlassianProviderUser = ({
	figmaUser,
}: TransformFigmaUserToAtlassianUserParams): AtlassianProviderUser => {
	return {
		id: figmaUser.id,
	};
};
