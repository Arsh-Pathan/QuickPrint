export declare const PrintJobStatus: {
    readonly Created: "created";
    readonly Paid: "paid";
    readonly Queued: "queued";
    readonly Printing: "printing";
    readonly Completed: "completed";
    readonly Failed: "failed";
    readonly Cancelled: "cancelled";
};
export type PrintJobStatus = (typeof PrintJobStatus)[keyof typeof PrintJobStatus];
export declare const PaperSize: {
    readonly A4: "A4";
    readonly A3: "A3";
    readonly Letter: "Letter";
    readonly Legal: "Legal";
};
export type PaperSize = (typeof PaperSize)[keyof typeof PaperSize];
export declare const PrinterStatus: {
    readonly Online: "online";
    readonly Offline: "offline";
    readonly Busy: "busy";
    readonly PaperOut: "paper_out";
    readonly TonerLow: "toner_low";
    readonly Jam: "jam";
    readonly Error: "error";
};
export type PrinterStatus = (typeof PrinterStatus)[keyof typeof PrinterStatus];
export declare const UserRole: {
    readonly Student: "student";
    readonly Admin: "admin";
    readonly Agent: "agent";
};
export type UserRole = (typeof UserRole)[keyof typeof UserRole];
export declare const PaymentStatus: {
    readonly Created: "created";
    readonly Authorized: "authorized";
    readonly Captured: "captured";
    readonly Failed: "failed";
    readonly Refunded: "refunded";
};
export type PaymentStatus = (typeof PaymentStatus)[keyof typeof PaymentStatus];
