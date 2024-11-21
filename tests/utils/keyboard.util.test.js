const KeyboardUtil = require('../../src/utils/keyboard.util');
const KEYBOARD = require('../../src/config/keyboard.config');

describe('KeyboardUtil', () => {
    describe('getMainKeyboard', () => {
        it('should return main keyboard with correct buttons', () => {
            const keyboard = KeyboardUtil.getMainKeyboard();
            expect(keyboard.reply_markup.keyboard).toEqual([
                [KEYBOARD.main.addWater.text],
                [KEYBOARD.main.stats.text, KEYBOARD.main.settings.text],
            ]);
            expect(keyboard.reply_markup.resize_keyboard).toBe(true);
        });
    });

    describe('getSettingsKeyboard', () => {
        it('should return settings keyboard with correct options', () => {
            const user = { notification_enabled: true };
            const keyboard = KeyboardUtil.getSettingsKeyboard(user);
            expect(keyboard.reply_markup.inline_keyboard).toEqual([
                [{ text: KEYBOARD.settings.goal.text, callback_data: `settings_${KEYBOARD.settings.goal.id}` }],
                [{ text: '🔕 Отключить уведомления', callback_data: `settings_${KEYBOARD.settings.notifications.id}` }],
                [{ text: KEYBOARD.settings.reset.text, callback_data: KEYBOARD.settings.reset.id }],
            ]);
        });

        it('should handle notifications toggle correctly', () => {
            const userDisabled = { notification_enabled: false };
            const keyboard = KeyboardUtil.getSettingsKeyboard(userDisabled);
            expect(keyboard.reply_markup.inline_keyboard[1][0].text).toBe('🔔 Включить уведомления');
        });
    });

    describe('getDrinkTypeKeyboard', () => {
        it('should return drink type keyboard with correct options', () => {
            const messageId = '123';
            const keyboard = KeyboardUtil.getDrinkTypeKeyboard(messageId);
            expect(keyboard.reply_markup.inline_keyboard).toEqual([
                [
                    { text: KEYBOARD.drinks.water.text, callback_data: `drink_${KEYBOARD.drinks.water.id}_${messageId}` },
                    { text: KEYBOARD.drinks.other.text, callback_data: `drink_${KEYBOARD.drinks.other.id}_${messageId}` },
                ],
            ]);
        });
    });

    describe('getCustomAmountKeyboard', () => {
        it('should return custom amount keyboard with correct options', () => {
            const messageId = '123';
            const type = 'water';
            const keyboard = KeyboardUtil.getCustomAmountKeyboard(type, messageId);
            
            // Check if amounts are sorted and custom option is at the bottom
            const buttons = keyboard.reply_markup.inline_keyboard;
            const lastRow = buttons[buttons.length - 1];
            
            expect(lastRow[0].text).toBe(KEYBOARD.amounts.custom.text);
            expect(lastRow[0].callback_data).toBe(`${type}_custom_${messageId}`);
            
            // Check if other amounts are sorted
            const amounts = buttons.slice(0, -1).flat().map(btn => parseFloat(btn.callback_data.split('_')[1]));
            const sortedAmounts = [...amounts].sort((a, b) => a - b);
            expect(amounts).toEqual(sortedAmounts);
        });
    });

    describe('getWaterAmountKeyboard', () => {
        it('should return water amount keyboard', () => {
            const messageId = '123';
            const keyboard = KeyboardUtil.getWaterAmountKeyboard(messageId);
            expect(keyboard.reply_markup.inline_keyboard.flat().some(btn => 
                btn.callback_data.startsWith(`${KEYBOARD.drinks.water.id}_`)
            )).toBe(true);
        });
    });

    describe('getOtherAmountKeyboard', () => {
        it('should return other amount keyboard', () => {
            const messageId = '123';
            const keyboard = KeyboardUtil.getOtherAmountKeyboard(messageId);
            expect(keyboard.reply_markup.inline_keyboard.flat().some(btn => 
                btn.callback_data.startsWith(`${KEYBOARD.drinks.other.id}_`)
            )).toBe(true);
        });
    });

    describe('getStatsKeyboard', () => {
        it('should return stats keyboard with correct periods', () => {
            const messageId = '123';
            const keyboard = KeyboardUtil.getStatsKeyboard(messageId);
            const periods = keyboard.reply_markup.inline_keyboard.flat().map(btn => btn.callback_data.split('_')[1]);
            
            expect(periods).toContain(KEYBOARD.periods.today.id);
            expect(periods).toContain(KEYBOARD.periods.week.id);
            expect(periods).toContain(KEYBOARD.periods.month.id);
            expect(periods).toContain(KEYBOARD.periods.all.id);
        });

        it('should format stats keyboard buttons correctly', () => {
            const messageId = '123';
            const keyboard = KeyboardUtil.getStatsKeyboard(messageId);
            const buttons = keyboard.reply_markup.inline_keyboard.flat();

            buttons.forEach(btn => {
                expect(btn.callback_data).toMatch(new RegExp(`^stats_.*_${messageId}$`));
                expect(btn.text).toBeDefined();
            });
        });
    });
});
