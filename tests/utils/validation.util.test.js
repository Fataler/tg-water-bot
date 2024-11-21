const ValidationUtil = require('../../src/utils/validation.util');
const config = require('../../src/config/config');

describe('ValidationUtil', () => {
    describe('isValidAmount', () => {
        it('should return true for valid amounts', () => {
            expect(ValidationUtil.isValidAmount('1.5')).toBe(true);
            expect(ValidationUtil.isValidAmount(2)).toBe(true);
            expect(ValidationUtil.isValidAmount(config.validation.water.minAmount)).toBe(true);
            expect(ValidationUtil.isValidAmount(config.validation.water.maxAmount)).toBe(true);
        });

        it('should return false for invalid amounts', () => {
            expect(ValidationUtil.isValidAmount('abc')).toBe(false);
            expect(ValidationUtil.isValidAmount(-1)).toBe(false);
            expect(ValidationUtil.isValidAmount(config.validation.water.maxAmount + 1)).toBe(false);
            expect(ValidationUtil.isValidAmount(config.validation.water.minAmount - 0.1)).toBe(false);
        });
    });

    describe('isValidGoal', () => {
        it('should return true for valid goals', () => {
            expect(ValidationUtil.isValidGoal('2.5')).toBe(true);
            expect(ValidationUtil.isValidGoal(3)).toBe(true);
            expect(ValidationUtil.isValidGoal(config.validation.water.maxAmount * 2)).toBe(true);
        });

        it('should return false for invalid goals', () => {
            expect(ValidationUtil.isValidGoal('abc')).toBe(false);
            expect(ValidationUtil.isValidGoal(-1)).toBe(false);
            expect(ValidationUtil.isValidGoal(config.validation.water.maxAmount * 2 + 1)).toBe(false);
        });
    });

    describe('isValidTime', () => {
        it('should return true for valid time formats', () => {
            expect(ValidationUtil.isValidTime('00:00')).toBe(true);
            expect(ValidationUtil.isValidTime('23:59')).toBe(true);
            expect(ValidationUtil.isValidTime('9:30')).toBe(true);
            expect(ValidationUtil.isValidTime('14:45')).toBe(true);
        });

        it('should return false for invalid time formats', () => {
            expect(ValidationUtil.isValidTime('24:00')).toBe(false);
            expect(ValidationUtil.isValidTime('12:60')).toBe(false);
            expect(ValidationUtil.isValidTime('abc')).toBe(false);
            expect(ValidationUtil.isValidTime('1234')).toBe(false);
        });
    });

    describe('sanitizeNumber', () => {
        it('should return valid numbers within range', () => {
            expect(ValidationUtil.sanitizeNumber('1.5')).toBe(1.5);
            expect(ValidationUtil.sanitizeNumber(2)).toBe(2);
        });

        it('should return null for invalid numbers', () => {
            expect(ValidationUtil.sanitizeNumber('abc')).toBe(null);
            expect(ValidationUtil.sanitizeNumber('')).toBe(null);
        });

        it('should clamp numbers to valid range', () => {
            expect(ValidationUtil.sanitizeNumber(-1)).toBe(0);
            expect(ValidationUtil.sanitizeNumber(config.validation.water.maxAmount + 1))
                .toBe(config.validation.water.maxAmount);
        });
    });

    describe('formatWaterAmount', () => {
        it('should format numbers with л suffix', () => {
            expect(ValidationUtil.formatWaterAmount(1)).toBe('1.00л');
            expect(ValidationUtil.formatWaterAmount('2.5')).toBe('2.50л');
            expect(ValidationUtil.formatWaterAmount(0.75)).toBe('0.75л');
        });
    });

    describe('formatPercentage', () => {
        it('should calculate correct percentages', () => {
            expect(ValidationUtil.formatPercentage(1, 2)).toBe(50);
            expect(ValidationUtil.formatPercentage(2.5, 2.5)).toBe(100);
            expect(ValidationUtil.formatPercentage(0.5, 2)).toBe(25);
        });

        it('should cap percentage at 100', () => {
            expect(ValidationUtil.formatPercentage(3, 2)).toBe(100);
        });
    });

    describe('createProgressBar', () => {
        it('should create correct progress bar', () => {
            expect(ValidationUtil.createProgressBar(0, 2)).toBe('⚪️'.repeat(10));
            expect(ValidationUtil.createProgressBar(2, 2)).toBe('🌊'.repeat(10));
            expect(ValidationUtil.createProgressBar(1, 2)).toBe('🌊'.repeat(5) + '⚪️'.repeat(5));
        });
    });
});
