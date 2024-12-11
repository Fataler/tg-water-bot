const config = require('../config/config');

class TimeUtil {
    static getCurrentTime() {
        return new Date(
            new Date().toLocaleString('en-US', { timeZone: config.notifications.timezone })
        );
    }

    static getCurrentHour() {
        return this.getCurrentTime().getHours();
    }

    static fromUnixTimestamp(timestamp) {
        return new Date(timestamp * 1000);
    }

    static toUnixTimestamp(date) {
        return Math.floor(date.getTime() / 1000);
    }
}

module.exports = TimeUtil;
