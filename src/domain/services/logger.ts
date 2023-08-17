export interface Logger {
	info(message: string, ...args: any[]): void;
	debug(message: string, ...ars: any[]): void;
	error(message: string, ...args: any[]): void;
}
