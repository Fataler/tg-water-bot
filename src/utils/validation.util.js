const config = require('../config/config');

class ValidationUtil {
    static isValidAmount(amount) {
        const normalizedAmount = String(amount).replace(',', '.');
        const numAmount = parseFloat(normalizedAmount);
        return (
            !isNaN(numAmount) &&
            numAmount >= config.validation.water.minAmount &&
            numAmount <= config.validation.water.maxAmount
        );
    }

    static isValidWaterAmount(amount) {
        return this.isValidAmount(amount);
    }

    static isValidGoal(goal) {
        const numGoal = parseFloat(goal);
        return (
            !isNaN(numGoal) &&
            numGoal >= config.validation.water.minAmount &&
            numGoal <= config.validation.water.maxAmount * 2
        );
    }

    static isValidTime(time) {
        const timeRegex = /^([01]?[0-9]|2[0-3]):[0-5][0-9]$/;
        return timeRegex.test(time);
    }

    static sanitizeNumber(input) {
        const normalizedInput = String(input).replace(',', '.');
        const num = parseFloat(normalizedInput);
        return isNaN(num) ? null : Math.max(0, Math.min(num, config.validation.water.maxAmount));
    }

    static formatWaterAmount(amount) {
        const num = parseFloat(amount);
        return `${num.toFixed(2)}л`;
    }

    static formatPercentage(current, goal) {
        return Math.min(Math.round((current / goal) * 100), 100);
    }

    static createProgressBar(current, goal) {
        const percentage = this.formatPercentage(current, goal);
        const filledBlocks = Math.floor(percentage / 10);
        const emptyBlocks = 10 - filledBlocks;
        return '🌊'.repeat(filledBlocks) + '⚪️'.repeat(emptyBlocks);
    }

    static createRatioBar(water, other) {
        const total = water + other;
        if (total === 0) return '⚪️'.repeat(10);
        const waterRatio = Math.floor((water / total) * 10);
        const otherRatio = 10 - waterRatio;
        return '💧'.repeat(waterRatio) + '🥤'.repeat(otherRatio);
    }
}

module.exports = ValidationUtil;
