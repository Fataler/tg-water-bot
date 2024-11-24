class DatabaseServiceMock {
    constructor() {
        this.db = null;
        this.users = new Map();
        this.waterIntake = new Map();
    }

    async init() {
        return Promise.resolve();
    }

    async addUser(userId, dailyGoal) {
        const user = {
            id: this.users.size + 1,
            chat_id: userId,
            daily_goal: dailyGoal,
            notification_enabled: true
        };
        this.users.set(userId, user);
        return user;
    }

    async getUser(chatId) {
        return this.users.get(chatId) || null;
    }

    async addWaterIntake(userId, amount, drinkType = 'water') {
        const intakeId = this.waterIntake.size + 1;
        const intake = {
            id: intakeId,
            user_id: userId,
            amount,
            drink_type: drinkType,
            created_at: new Date().toISOString()
        };
        this.waterIntake.set(intakeId, intake);
        return intake;
    }

    async updateUser(chatId, updates) {
        const user = this.users.get(chatId);
        if (!user) {
            return null;
        }
        const updatedUser = { ...user, ...updates };
        this.users.set(chatId, updatedUser);
        return updatedUser;
    }

    async deleteUser(chatId) {
        return this.users.delete(chatId);
    }

    async getAllUsers() {
        return Array.from(this.users.values());
    }

    async getDailyWaterIntake(userId) {
        const today = new Date().toISOString().split('T')[0];
        return Array.from(this.waterIntake.values())
            .filter(intake => {
                return intake.user_id === userId &&
                    intake.created_at.startsWith(today);
            })
            .reduce((total, intake) => total + intake.amount, 0);
    }

    async getWeeklyWaterIntake(userId) {
        const now = new Date();
        const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        return Array.from(this.waterIntake.values())
            .filter(intake => {
                const intakeDate = new Date(intake.created_at);
                return intake.user_id === userId &&
                    intakeDate >= weekAgo &&
                    intakeDate <= now;
            })
            .reduce((total, intake) => total + intake.amount, 0);
    }

    async getMonthlyWaterIntake(userId) {
        const now = new Date();
        const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        return Array.from(this.waterIntake.values())
            .filter(intake => {
                const intakeDate = new Date(intake.created_at);
                return intake.user_id === userId &&
                    intakeDate >= monthAgo &&
                    intakeDate <= now;
            })
            .reduce((total, intake) => total + intake.amount, 0);
    }

    async getAllTimeWaterIntake(userId) {
        return Array.from(this.waterIntake.values())
            .filter(intake => intake.user_id === userId)
            .reduce((total, intake) => total + intake.amount, 0);
    }

    getMode() {
        return 'test';
    }

    getDbPath() {
        return ':memory:';
    }

    exists() {
        return true;
    }

    close() {
        this.users.clear();
        this.waterIntake.clear();
    }
}

module.exports = DatabaseServiceMock;
