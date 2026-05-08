import { z } from 'zod';
import { PaperSize } from './enums';

export const printSettingsSchema = z.object({
  color: z.boolean().default(false),
  duplex: z.boolean().default(false),
  copies: z.number().int().min(1).max(50).default(1),
  paperSize: z.enum([PaperSize.A4, PaperSize.A3, PaperSize.Letter, PaperSize.Legal]).default(
    PaperSize.A4,
  ),
  pageRange: z.string().optional(),
});
export type PrintSettings = z.infer<typeof printSettingsSchema>;

export const createPrintJobSchema = z.object({
  fileKey: z.string().min(1),
  fileName: z.string().min(1),
  fileSize: z.number().int().positive(),
  mimeType: z.string().min(1),
  settings: printSettingsSchema,
});
export type CreatePrintJobDto = z.infer<typeof createPrintJobSchema>;
