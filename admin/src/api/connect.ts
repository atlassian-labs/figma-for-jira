export function getAtlassianAccountId(): Promise<string> {
	return new Promise((resolve) => {
		return AP.user.getCurrentUser((user: { atlassianAccountId: string }) => {
			resolve(user.atlassianAccountId);
		});
	});
}

export function getCurrentAtlassianSite(): Promise<string> {
	return new Promise((resolve, reject) => {
		return AP.getLocation((location) => {
			try {
				const url = new URL(location);
				resolve(url.host);
			} catch (e) {
				reject(e);
			}
		});
	});
}
