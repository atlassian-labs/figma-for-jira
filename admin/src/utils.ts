export function openInBrowser(url: string) {
	const openedWindow = window.open(url, '_blank');
	if (
		!openedWindow ||
		openedWindow.closed ||
		typeof openedWindow.closed === 'undefined'
	) {
		return null;
	}
	return openedWindow;
}
