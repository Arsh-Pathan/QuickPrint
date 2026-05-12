-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "phone" TEXT,
    "name" TEXT,
    "role" TEXT NOT NULL DEFAULT 'STUDENT',
    "shopId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "Shop" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "address" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "Printer" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "shopId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "driver" TEXT,
    "supportsColor" BOOLEAN NOT NULL DEFAULT false,
    "supportsDuplex" BOOLEAN NOT NULL DEFAULT false,
    "status" TEXT NOT NULL DEFAULT 'OFFLINE',
    "lastSeenAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Printer_shopId_fkey" FOREIGN KEY ("shopId") REFERENCES "Shop" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "PrinterHealthSnapshot" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "printerId" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "paperLevel" INTEGER,
    "tonerLevel" INTEGER,
    "message" TEXT,
    "capturedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "PrinterHealthSnapshot_printerId_fkey" FOREIGN KEY ("printerId") REFERENCES "Printer" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "PrintJob" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "ownerId" TEXT NOT NULL,
    "shopId" TEXT,
    "printerId" TEXT,
    "fileKey" TEXT NOT NULL,
    "fileName" TEXT NOT NULL,
    "fileSize" INTEGER NOT NULL,
    "mimeType" TEXT NOT NULL,
    "fileHash" TEXT,
    "pages" INTEGER NOT NULL DEFAULT 0,
    "colorPages" INTEGER NOT NULL DEFAULT 0,
    "color" BOOLEAN NOT NULL DEFAULT false,
    "duplex" BOOLEAN NOT NULL DEFAULT false,
    "copies" INTEGER NOT NULL DEFAULT 1,
    "paperSize" TEXT NOT NULL DEFAULT 'A4',
    "pageRange" TEXT,
    "priceTotalPaise" INTEGER NOT NULL DEFAULT 0,
    "priceBreakdown" TEXT,
    "status" TEXT NOT NULL DEFAULT 'CREATED',
    "failureReason" TEXT,
    "retryCount" INTEGER NOT NULL DEFAULT 0,
    "priority" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "paidAt" DATETIME,
    "printedAt" DATETIME,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "PrintJob_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "PrintJob_printerId_fkey" FOREIGN KEY ("printerId") REFERENCES "Printer" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Payment" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "jobId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "razorpayOrderId" TEXT NOT NULL,
    "razorpayPaymentId" TEXT,
    "razorpaySignature" TEXT,
    "amountPaise" INTEGER NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'INR',
    "status" TEXT NOT NULL DEFAULT 'CREATED',
    "rawWebhookPayload" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "capturedAt" DATETIME,
    CONSTRAINT "Payment_jobId_fkey" FOREIGN KEY ("jobId") REFERENCES "PrintJob" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Payment_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "QueueEntry" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "jobId" TEXT NOT NULL,
    "shopId" TEXT NOT NULL,
    "position" INTEGER NOT NULL,
    "priority" INTEGER NOT NULL DEFAULT 0,
    "etaSeconds" INTEGER,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "QueueEntry_jobId_fkey" FOREIGN KEY ("jobId") REFERENCES "PrintJob" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Notification" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT,
    "channel" TEXT NOT NULL,
    "target" TEXT NOT NULL,
    "template" TEXT NOT NULL,
    "payload" TEXT NOT NULL,
    "deliveredAt" DATETIME,
    "failedAt" DATETIME,
    "error" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Notification_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "AuditLog" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "actorId" TEXT,
    "action" TEXT NOT NULL,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "before" TEXT,
    "after" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "AuditLog_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Setting" (
    "key" TEXT NOT NULL PRIMARY KEY,
    "value" TEXT NOT NULL,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "SystemEvent" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "shopId" TEXT,
    "printerId" TEXT,
    "jobId" TEXT,
    "type" TEXT NOT NULL,
    "severity" TEXT NOT NULL DEFAULT 'info',
    "message" TEXT NOT NULL,
    "metadata" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateIndex
CREATE UNIQUE INDEX "User_phone_key" ON "User"("phone");

-- CreateIndex
CREATE INDEX "User_role_idx" ON "User"("role");

-- CreateIndex
CREATE INDEX "User_shopId_idx" ON "User"("shopId");

-- CreateIndex
CREATE INDEX "Printer_shopId_idx" ON "Printer"("shopId");

-- CreateIndex
CREATE INDEX "Printer_status_idx" ON "Printer"("status");

-- CreateIndex
CREATE INDEX "PrinterHealthSnapshot_printerId_capturedAt_idx" ON "PrinterHealthSnapshot"("printerId", "capturedAt");

-- CreateIndex
CREATE INDEX "PrintJob_ownerId_idx" ON "PrintJob"("ownerId");

-- CreateIndex
CREATE INDEX "PrintJob_status_idx" ON "PrintJob"("status");

-- CreateIndex
CREATE INDEX "PrintJob_shopId_status_idx" ON "PrintJob"("shopId", "status");

-- CreateIndex
CREATE INDEX "PrintJob_createdAt_idx" ON "PrintJob"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "Payment_jobId_key" ON "Payment"("jobId");

-- CreateIndex
CREATE INDEX "Payment_userId_idx" ON "Payment"("userId");

-- CreateIndex
CREATE INDEX "Payment_status_idx" ON "Payment"("status");

-- CreateIndex
CREATE INDEX "Payment_razorpayOrderId_idx" ON "Payment"("razorpayOrderId");

-- CreateIndex
CREATE INDEX "Payment_razorpayPaymentId_idx" ON "Payment"("razorpayPaymentId");

-- CreateIndex
CREATE UNIQUE INDEX "QueueEntry_jobId_key" ON "QueueEntry"("jobId");

-- CreateIndex
CREATE INDEX "QueueEntry_shopId_position_idx" ON "QueueEntry"("shopId", "position");

-- CreateIndex
CREATE INDEX "Notification_userId_idx" ON "Notification"("userId");

-- CreateIndex
CREATE INDEX "Notification_deliveredAt_idx" ON "Notification"("deliveredAt");

-- CreateIndex
CREATE INDEX "AuditLog_entityType_entityId_idx" ON "AuditLog"("entityType", "entityId");

-- CreateIndex
CREATE INDEX "AuditLog_createdAt_idx" ON "AuditLog"("createdAt");

-- CreateIndex
CREATE INDEX "SystemEvent_shopId_createdAt_idx" ON "SystemEvent"("shopId", "createdAt");

-- CreateIndex
CREATE INDEX "SystemEvent_type_idx" ON "SystemEvent"("type");
