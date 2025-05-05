export function getAppBasePath(): string | undefined {
	return import.meta.env.VITE_FIGMA_FOR_JIRA_APP_BASE_PATH;
}

export function getAppPath(path: string): string {
	return `${getAppBasePath()}${path}`;
}
