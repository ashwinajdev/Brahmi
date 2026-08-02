"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const mongoose_js_1 = require("./mongoose.js");
const User_js_1 = __importDefault(require("../models/User.js"));
const Worker_js_1 = __importDefault(require("../models/Worker.js"));
const Work_js_1 = __importDefault(require("../models/Work.js"));
const WorkAssignment_js_1 = __importDefault(require("../models/WorkAssignment.js"));
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const mongoose_1 = __importDefault(require("mongoose"));
async function main() {
    console.log('Seeding database...');
    await (0, mongoose_js_1.connectDB)();
    // 1. Clean existing data
    await WorkAssignment_js_1.default.deleteMany({});
    await Work_js_1.default.deleteMany({});
    await Worker_js_1.default.deleteMany({});
    await User_js_1.default.deleteMany({});
    // 2. Seed default admin user
    const hashedPassword = await bcryptjs_1.default.hash('2525', 10);
    const adminUser = new User_js_1.default({
        email: 'admin@brahmi.com',
        password: hashedPassword,
        name: 'Prakash Holla',
        avatarUrl: null,
    });
    await adminUser.save();
    console.log(`Created admin user: ${adminUser.email}`);
    console.log('Database seeding completed successfully.');
    await mongoose_1.default.disconnect();
}
main().catch((e) => {
    console.error(e);
    process.exit(1);
});
