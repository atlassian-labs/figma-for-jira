import type { FigmaDesignIdentifier } from './figma-design-identifier';

export type AssociatedFigmaDesign = {
	readonly id: number;
	readonly designId: FigmaDesignIdentifier;
	/**
	 * An Atlassian Resource Identifier (ARI) of a target entity.
	 */
	readonly associatedWithAri: string;
	readonly connectInstallationId: number;
};

export type AssociatedFigmaDesignCreateParams = Omit<
	AssociatedFigmaDesign,
	'id'
>;
