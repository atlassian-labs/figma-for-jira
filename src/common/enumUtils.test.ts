import { isEnumValueOf } from './enumUtils';

enum NumericTestEnum {
	ONE = 1,
}

enum StringTestEnum {
	ONE = 'ONE',
}

describe('enumUtils', () => {
	describe('isEnumValueOf', () => {
		it('should return `true` if value is enum value', () => {
			expect(isEnumValueOf(NumericTestEnum, 1)).toBe(true);
			expect(isEnumValueOf(StringTestEnum, 'ONE')).toBe(true);
		});

		it('should return `false` if value is not enum value', () => {
			expect(isEnumValueOf(NumericTestEnum, 0)).toBe(false);
			expect(isEnumValueOf(StringTestEnum, 'NON_VALUE')).toBe(false);
		});
	});
});
