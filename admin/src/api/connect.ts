export function getAtlassianAccountId(): Promise<string> {
	return new Promise((resolve) => {
		return AP.user.getCurrentUser((user: { atlassianAccountId: string }) => {
			resolve(user.atlassianAccountId);
		});
	});
}
