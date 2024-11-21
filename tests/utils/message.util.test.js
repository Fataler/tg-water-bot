const MessageUtil = require('../../src/utils/message.util');
const config = require('../../src/config/config');

describe('MessageUtil', () => {
    describe('formatWaterAddedMessage', () => {
        it('should format water added message correctly', () => {
            const amount = 0.5;
            const total = { water: 1.0, other: 0.5, total: 1.5 };
            const message = MessageUtil.formatWaterAddedMessage(amount, total);
            
            expect(message).toContain('0.50л');
            expect(message).toContain('1.00л');
            expect(message).toContain('0.50л');
            expect(message).toContain('1.50л');
        });
    });
});
