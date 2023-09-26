import type { FigmaDesignIdentifier } from './figma-design-identifier';

export type AssociatedFigmaDesign = {
	readonly id: string;
	readonly designId: FigmaDesignIdentifier;
	/**
	 * An Atlassian Resource Identifier (ARI) of a target entity.
	 */
	readonly associatedWithAri: string;
	readonly connectInstallationId: string;
};

export type AssociatedFigmaDesignCreateParams = Omit<
	AssociatedFigmaDesign,
	'id'
>;
