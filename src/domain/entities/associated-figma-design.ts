import type { AtlassianDesignStatus } from './atlassian-design';
import type { FigmaDesignIdentifier } from './figma-design-identifier';

/**
 * Holds information on a Figma design associated with a particular Jira Issue.
 *
 * Allows to track all associated Figma designs, which is required by some
 * functionality (e.g., data sync).
 */
export type AssociatedFigmaDesign = {
	readonly id: string;
	readonly designId: FigmaDesignIdentifier;
	/**
	 * An Atlassian Resource Identifier (ARI) of a target entity.
	 */
	readonly associatedWithAri: string;
	readonly connectInstallationId: string;
	/**
	 * The original design URL provided by a user. While this information is not required
	 * by the current business logic, it provides more flexibility in handling possible future
	 * changes in the requirements. For example, having the original user's URL, it is possible
	 * to adjust the way how designs are constructed and re-submit these designs to Jira.
	 */
	readonly inputUrl?: string;

	readonly devStatus: AtlassianDesignStatus;
	readonly devStatusLastModified?: string;
};

export type AssociatedFigmaDesignCreateParams = Omit<
	AssociatedFigmaDesign,
	'id'
>;
