"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createPrintJobSchema = exports.printSettingsSchema = void 0;
const zod_1 = require("zod");
const enums_1 = require("./enums");
exports.printSettingsSchema = zod_1.z.object({
    color: zod_1.z.boolean().default(false),
    duplex: zod_1.z.boolean().default(false),
    copies: zod_1.z.number().int().min(1).max(50).default(1),
    paperSize: zod_1.z.enum([enums_1.PaperSize.A4, enums_1.PaperSize.A3, enums_1.PaperSize.Letter, enums_1.PaperSize.Legal]).default(enums_1.PaperSize.A4),
    pageRange: zod_1.z.string().optional(),
});
exports.createPrintJobSchema = zod_1.z.object({
    fileKey: zod_1.z.string().min(1),
    fileName: zod_1.z.string().min(1),
    fileSize: zod_1.z.number().int().positive(),
    mimeType: zod_1.z.string().min(1),
    settings: exports.printSettingsSchema,
});
//# sourceMappingURL=print-job.js.map