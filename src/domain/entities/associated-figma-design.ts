import type { FigmaDesignIdentifier } from './figma-design-identifier';

export type AssociatedFigmaDesign = {
	readonly id: bigint;
	readonly designId: FigmaDesignIdentifier;
	/**
	 * An Atlassian Resource Identifier (ARI) of a target entity.
	 */
	readonly associatedWithAri: string;
	readonly connectInstallationId: bigint;
};

export type AssociatedFigmaDesignCreateParams = Omit<
	AssociatedFigmaDesign,
	'id'
>;
