export const PrintJobStatus = {
  Created: 'created',
  Paid: 'paid',
  Queued: 'queued',
  Printing: 'printing',
  Completed: 'completed',
  Failed: 'failed',
  Cancelled: 'cancelled',
} as const;
export type PrintJobStatus = (typeof PrintJobStatus)[keyof typeof PrintJobStatus];

export const PaperSize = {
  A4: 'A4',
  A3: 'A3',
  Letter: 'Letter',
  Legal: 'Legal',
} as const;
export type PaperSize = (typeof PaperSize)[keyof typeof PaperSize];

export const PrinterStatus = {
  Online: 'online',
  Offline: 'offline',
  Busy: 'busy',
  PaperOut: 'paper_out',
  TonerLow: 'toner_low',
  Jam: 'jam',
  Error: 'error',
} as const;
export type PrinterStatus = (typeof PrinterStatus)[keyof typeof PrinterStatus];

export const UserRole = {
  Student: 'student',
  Admin: 'admin',
  Agent: 'agent',
} as const;
export type UserRole = (typeof UserRole)[keyof typeof UserRole];

export const PaymentStatus = {
  Created: 'created',
  Authorized: 'authorized',
  Captured: 'captured',
  Failed: 'failed',
  Refunded: 'refunded',
} as const;
export type PaymentStatus = (typeof PaymentStatus)[keyof typeof PaymentStatus];
