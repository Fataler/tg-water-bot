const config = require('../config/config');

class ValidationUtil {
    static isValidWaterAmount(amount) {
        const numAmount = parseFloat(amount);
        return !isNaN(numAmount) && 
               numAmount >= config.validation.water.minAmount && 
               numAmount <= config.validation.water.maxAmount;
    }

    static isValidGoal(goal) {
        const numGoal = parseFloat(goal);
        return !isNaN(numGoal) && 
               numGoal >= config.validation.water.minAmount && 
               numGoal <= config.validation.water.maxAmount * 2;
    }

    static isValidTime(time) {
        const timeRegex = /^([01]?[0-9]|2[0-3]):[0-5][0-9]$/;
        return timeRegex.test(time);
    }

    static sanitizeNumber(input) {
        const num = parseFloat(input);
        return isNaN(num) ? null : Math.max(0, Math.min(num, config.validation.water.maxAmount));
    }

    static formatWaterAmount(amount) {
        return `${amount.toFixed(2)}л`;
    }

    static formatPercentage(current, goal) {
        return Math.min(Math.round((current / goal) * 100), 100);
    }

    static createProgressBar(percentage) {
        const filledBlocks = Math.floor(percentage / 10);
        const emptyBlocks = 10 - filledBlocks;
        return '🌊'.repeat(filledBlocks) + '⚪️'.repeat(emptyBlocks);
    }
}

module.exports = ValidationUtil;
