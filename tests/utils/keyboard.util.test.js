const KeyboardUtil = require('../../src/utils/keyboard.util');

describe('KeyboardUtil', () => {
    describe('getMainKeyboard', () => {
        it('should return main keyboard with correct buttons', () => {
            const keyboard = KeyboardUtil.getMainKeyboard();
            expect(keyboard).toHaveProperty('reply_markup');
            expect(keyboard.reply_markup).toHaveProperty('keyboard');
            
            const buttons = keyboard.reply_markup.keyboard;
            expect(buttons).toBeInstanceOf(Array);
            expect(buttons.length).toBeGreaterThan(0);
            expect(buttons[0]).toContain('💧 Добавить воду');
        });
    });

    describe('getSettingsKeyboard', () => {
        it('should return settings keyboard with correct options', () => {
            const keyboard = KeyboardUtil.getSettingsKeyboard();
            expect(keyboard).toHaveProperty('reply_markup');
            expect(keyboard.reply_markup).toHaveProperty('inline_keyboard');
            
            const buttons = keyboard.reply_markup.inline_keyboard;
            expect(buttons).toBeInstanceOf(Array);
            expect(buttons.length).toBeGreaterThan(0);
            
            // Check for common settings buttons
            const buttonTexts = buttons.flat().map(btn => btn.text);
            expect(buttonTexts).toContain('🎯 Изменить цель');
            expect(buttonTexts).toContain('🔔 Включить уведомления');
            expect(buttonTexts).toContain('🔄 Сброс');
        });
    });

    describe('getDrinkTypeKeyboard', () => {
        it('should return drink type keyboard with correct options', () => {
            const keyboard = KeyboardUtil.getDrinkTypeKeyboard();
            expect(keyboard).toHaveProperty('reply_markup');
            expect(keyboard.reply_markup).toHaveProperty('inline_keyboard');
            
            const buttons = keyboard.reply_markup.inline_keyboard;
            expect(buttons).toBeInstanceOf(Array);
            expect(buttons.length).toBeGreaterThan(0);
            
            // Check for drink type buttons
            const buttonTexts = buttons.flat().map(btn => btn.text);
            expect(buttonTexts).toContain('💧 Вода');
            expect(buttonTexts).toContain('🥤 Другое');
        });
    });
});
