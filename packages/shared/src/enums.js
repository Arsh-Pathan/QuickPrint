"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PaymentStatus = exports.UserRole = exports.PrinterStatus = exports.PaperSize = exports.PrintJobStatus = void 0;
exports.PrintJobStatus = {
    Created: 'created',
    Paid: 'paid',
    Queued: 'queued',
    Printing: 'printing',
    Completed: 'completed',
    Failed: 'failed',
    Cancelled: 'cancelled',
};
exports.PaperSize = {
    A4: 'A4',
    A3: 'A3',
    Letter: 'Letter',
    Legal: 'Legal',
};
exports.PrinterStatus = {
    Online: 'online',
    Offline: 'offline',
    Busy: 'busy',
    PaperOut: 'paper_out',
    TonerLow: 'toner_low',
    Jam: 'jam',
    Error: 'error',
};
exports.UserRole = {
    Student: 'student',
    Admin: 'admin',
    Agent: 'agent',
};
exports.PaymentStatus = {
    Created: 'created',
    Authorized: 'authorized',
    Captured: 'captured',
    Failed: 'failed',
    Refunded: 'refunded',
};
//# sourceMappingURL=enums.js.map