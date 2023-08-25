const MILLISECONDS_PER_SECOND = 1000;
const SECONDS_PER_MINUTE = 60;

export class Duration {
	private constructor(private readonly value: number) {}

	toMillis(): number {
		return this.value;
	}

	static ofMinutes(minutes: number): Duration {
		return new Duration(minutes * SECONDS_PER_MINUTE * MILLISECONDS_PER_SECOND);
	}
}
