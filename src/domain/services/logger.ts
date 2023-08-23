export interface Logger {
	info: (message: string, ...args: unknown[]) => void;
	debug: (message: string, ...ars: unknown[]) => void;
	error: (message: string, ...args: unknown[]) => void;
}
