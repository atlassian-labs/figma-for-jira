const MILLISECONDS_PER_SECOND = 1000;
const SECONDS_PER_MINUTE = 60;

export class Duration {
	private constructor(private readonly value: number) {}

	get asMilliseconds(): number {
		return this.value;
	}

	get asSeconds(): number {
		return this.value / MILLISECONDS_PER_SECOND;
	}

	static ofSeconds(seconds: number): Duration {
		return new Duration(seconds * MILLISECONDS_PER_SECOND);
	}

	static ofMinutes(minutes: number): Duration {
		return new Duration(minutes * SECONDS_PER_MINUTE * MILLISECONDS_PER_SECOND);
	}
}
