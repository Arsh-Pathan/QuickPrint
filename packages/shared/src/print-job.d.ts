import { z } from 'zod';
export declare const printSettingsSchema: z.ZodObject<{
    color: z.ZodDefault<z.ZodBoolean>;
    duplex: z.ZodDefault<z.ZodBoolean>;
    copies: z.ZodDefault<z.ZodNumber>;
    paperSize: z.ZodDefault<z.ZodEnum<["A4", "A3", "Letter", "Legal"]>>;
    pageRange: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    copies: number;
    duplex: boolean;
    color: boolean;
    paperSize: "A4" | "A3" | "Letter" | "Legal";
    pageRange?: string | undefined;
}, {
    copies?: number | undefined;
    duplex?: boolean | undefined;
    color?: boolean | undefined;
    paperSize?: "A4" | "A3" | "Letter" | "Legal" | undefined;
    pageRange?: string | undefined;
}>;
export type PrintSettings = z.infer<typeof printSettingsSchema>;
export declare const createPrintJobSchema: z.ZodObject<{
    fileKey: z.ZodString;
    fileName: z.ZodString;
    fileSize: z.ZodNumber;
    mimeType: z.ZodString;
    settings: z.ZodObject<{
        color: z.ZodDefault<z.ZodBoolean>;
        duplex: z.ZodDefault<z.ZodBoolean>;
        copies: z.ZodDefault<z.ZodNumber>;
        paperSize: z.ZodDefault<z.ZodEnum<["A4", "A3", "Letter", "Legal"]>>;
        pageRange: z.ZodOptional<z.ZodString>;
    }, "strip", z.ZodTypeAny, {
        copies: number;
        duplex: boolean;
        color: boolean;
        paperSize: "A4" | "A3" | "Letter" | "Legal";
        pageRange?: string | undefined;
    }, {
        copies?: number | undefined;
        duplex?: boolean | undefined;
        color?: boolean | undefined;
        paperSize?: "A4" | "A3" | "Letter" | "Legal" | undefined;
        pageRange?: string | undefined;
    }>;
}, "strip", z.ZodTypeAny, {
    fileName: string;
    fileKey: string;
    fileSize: number;
    mimeType: string;
    settings: {
        copies: number;
        duplex: boolean;
        color: boolean;
        paperSize: "A4" | "A3" | "Letter" | "Legal";
        pageRange?: string | undefined;
    };
}, {
    fileName: string;
    fileKey: string;
    fileSize: number;
    mimeType: string;
    settings: {
        copies?: number | undefined;
        duplex?: boolean | undefined;
        color?: boolean | undefined;
        paperSize?: "A4" | "A3" | "Letter" | "Legal" | undefined;
        pageRange?: string | undefined;
    };
}>;
export type CreatePrintJobDto = z.infer<typeof createPrintJobSchema>;
