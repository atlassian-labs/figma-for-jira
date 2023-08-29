import { AxiosError } from 'axios';

import {
	figmaAuthService,
	NoFigmaCredentialsError,
	RefreshFigmaCredentialsError,
} from './figma-auth-service';
import {
	figmaClient,
	FileNodesResponse,
	FileResponse,
	NodeDevStatus,
} from './figma-client';

import { HttpStatus } from '../../common/http-status';
import {
	DataDepotDesign,
	DesignStatus,
	DesignType,
} from '../../domain/entities/design';
import { AssociateWith } from '../../web/routes/entities';
import { getLogger } from '../logger';

type FigmaUrlData = {
	fileKey: string;
	nodeId?: string;
	isPrototype: boolean;
};

const extractDataFromFigmaUrl = (url: string): FigmaUrlData | null => {
	const fileKeyRegex = /file\/([a-zA-Z0-9]+)/;
	const nodeIdRegex = /node-id=([a-zA-Z0-9-]+)/;
	const prototypeRegex = /\/proto\//;

	const fileKeyMatch = url.match(fileKeyRegex);
	const nodeIdMatch = url.match(nodeIdRegex);
	const isPrototype = prototypeRegex.test(url);

	if (!fileKeyMatch) {
		return null;
	}

	const fileKey = fileKeyMatch[1];
	const nodeId = nodeIdMatch ? nodeIdMatch[1] : undefined;

	return {
		fileKey,
		nodeId,
		isPrototype,
	};
};

const buildLiveEmbedUrl = (url: string): string => {
	// TODO: implement this function
	return url;
};

const buildInspectUrl = (url: string): string => {
	// TODO: implement this function
	return url;
};

// export type DataDepotDesignz = {
// 	id: string;
// 	displayName: string;
// 	url: string;
// 	liveEmbedUrl: string;
// 	inspectUrl?: string;
// 	status: DesignStatus;
// 	type: DesignType;
// 	lastUpdated: string;
// 	updateSequenceNumber: string;
// 	addAssociations: Association[];
// 	removeAssociations: Association[];
// };

const mapNodeStatusToDevStatus = (devStatus: NodeDevStatus): DesignStatus =>
	devStatus.type === 'READY_FOR_DEV'
		? DesignStatus.READY_FOR_DEVELOPMENT
		: DesignStatus.UNKNOWN;

const mapNodeTypeToDesignType = (
	type: string,
	isPrototype: boolean,
): DesignType => {
	if (isPrototype) {
		return DesignType.PROTOTYPE;
	}
	if (type === 'DOCUMENT') {
		return DesignType.FILE;
	}
	if (type === 'CANVAS') {
		return DesignType.CANVAS;
	}
	if (type === 'SECTION' || type === 'GROUP') {
		return DesignType.GROUP;
	}
	if (type === 'FRAME') {
		return DesignType.NODE;
	}
	return DesignType.OTHER;
};

type TransformNodeToDataDepotDesignArgs = {
	nodeId: string;
	url: string;
	isPrototype: boolean;
	associateWith: AssociateWith;
	fileNodesResponse: FileNodesResponse;
};

const transformNodeToDataDepotDesign = ({
	nodeId,
	url,
	isPrototype,
	associateWith,
	fileNodesResponse,
}: TransformNodeToDataDepotDesignArgs): DataDepotDesign => {
	const node = fileNodesResponse.nodes[nodeId].document;
	return {
		id: node.id,
		displayName: node.name,
		url,
		liveEmbedUrl: buildLiveEmbedUrl(url),
		inspectUrl: buildInspectUrl(url),
		status: node.devStatus
			? mapNodeStatusToDevStatus(node.devStatus)
			: DesignStatus.NONE,
		type: mapNodeTypeToDesignType(node.type, isPrototype),
		// TODO: need to get the last modified of the node once available in Figma's API
		lastUpdated: fileNodesResponse.lastModified,
		// TODO: How do we generate this?
		updateSequenceNumber: '123',
		// TODO: associationType should be a const
		addAssociations: [
			{ associationType: 'issue-has-design', values: [associateWith.ari] },
		],
		removeAssociations: [],
	};
};

type TransformFileToDataDepotDesignArgs = {
	url: string;
	isPrototype: boolean;
	associateWith: AssociateWith;
	fileResponse: FileResponse;
};

const transformFileToDataDepotDesign = ({
	url,
	isPrototype,
	associateWith,
	fileResponse,
}: TransformFileToDataDepotDesignArgs): DataDepotDesign => {
	return {
		id: fileResponse.document.id,
		displayName: fileResponse.name,
		url,
		liveEmbedUrl: buildLiveEmbedUrl(url),
		inspectUrl: buildInspectUrl(url),
		status: DesignStatus.NONE,
		type: isPrototype ? DesignType.PROTOTYPE : DesignType.FILE,
		lastUpdated: fileResponse.lastModified,
		// TODO: How do we generate this?
		updateSequenceNumber: '123',
		// TODO: associationType should be a const
		addAssociations: [
			{ associationType: 'issue-has-design', values: [associateWith.ari] },
		],
		removeAssociations: [],
	};
};

export class FigmaService {
	validateAuth = async (atlassianUserId: string): Promise<boolean> => {
		try {
			const credentials =
				await figmaAuthService.getCredentials(atlassianUserId);
			await figmaClient.me(credentials.accessToken);

			return true;
		} catch (e: unknown) {
			if (
				e instanceof NoFigmaCredentialsError ||
				e instanceof RefreshFigmaCredentialsError
			)
				return false;

			const forbidden =
				e instanceof AxiosError && e?.response?.status == HttpStatus.FORBIDDEN;

			if (forbidden) return false;

			throw e;
		}
	};

	fetchDesign = async (
		url: string,
		atlassianUserId: string,
		associateWith: AssociateWith,
	): Promise<DataDepotDesign> => {
		const hasValidAuth = await this.validateAuth(atlassianUserId);
		if (!hasValidAuth) {
			// TODO: Is throwing the right course of action here?
			throw new Error('Invalid auth');
		}

		const { accessToken } =
			await figmaAuthService.getCredentials(atlassianUserId);

		const urlData = extractDataFromFigmaUrl(url);
		if (!urlData) {
			const errorMessage = `Received invalid Figma URL: ${url}`;
			getLogger().error(errorMessage);
			throw new InvalidURLError(errorMessage);
		}

		const { fileKey, nodeId, isPrototype } = urlData;

		if (nodeId) {
			// TODO: add try/catch block and handle errors
			const fileNodesResponse = await figmaClient.getFileNodes(
				fileKey,
				nodeId,
				accessToken,
			);
			return transformNodeToDataDepotDesign({
				nodeId,
				url,
				isPrototype,
				associateWith,
				fileNodesResponse,
			});
		} else {
			// TODO: add try/catch block and handle errors
			const fileResponse = await figmaClient.getFile(fileKey, accessToken);
			return transformFileToDataDepotDesign({
				url,
				isPrototype,
				associateWith,
				fileResponse,
			});
		}
	};
}

export class InvalidURLError extends Error {
	constructor(message: string) {
		super(message);
	}
}

export const figmaService = new FigmaService();
