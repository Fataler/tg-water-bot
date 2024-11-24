class NotificationServiceMock {
    constructor() {
        this.sendWaterReminder = jest.fn();
        this.sendReminder = jest.fn();
        this.scheduleReminders = jest.fn();
        this.cancelReminders = jest.fn();
    }
}

module.exports = { NotificationServiceMock };
