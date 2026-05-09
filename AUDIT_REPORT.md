# QuickPrint — Software Audit & Issues Report

**Date:** May 9, 2026
**Status:** Alpha / Development
**Auditor:** Gemini CLI

## 1. Executive Summary
QuickPrint is a well-architected monorepo with a robust design for autonomous printing. The use of a durable SQLite queue in the Print Agent and HMAC-signed storage URLs demonstrates a strong focus on reliability and security. However, several critical issues were identified, most notably a total lack of automated testing and build failures in the frontend applications.

## 2. Critical Flaws & Issues

### 2.1 Build Failures (Frontend)
- **Status:** 🔴 CRITICAL
- **Issue:** Both `apps/admin` and `apps/web` fail to build in production mode.
- **Root Cause:** Next.js 15 throws `Error: <Html> should not be imported outside of pages/_document.` during the build. This indicates a conflict between the App Router configuration and legacy components or automatic 404 page generation.
- **Impact:** The applications cannot be deployed to production.

### 2.2 Lack of Automated Testing
- **Status:** 🔴 CRITICAL
- **Issue:** There are zero `.spec.ts` or `.test.ts` files in the entire monorepo.
- **Impact:** High risk of regressions, especially in the complex print job lifecycle and pricing logic.
- **Recommendation:** Implement Jest/Vitest for unit testing and Playwright for E2E testing of the "Golden Path".

### 2.3 Page Analysis Incompleteness
- **Status:** 🟡 WARNING
- **Issue:** `PageAnalyzerService` (Backend) currently defaults `colorPages` to 0 for all PDFs.
- **Impact:** Incorrect pricing for color documents.
- **Recommendation:** Integrate `ghostscript` or a similar tool to perform pixel-level analysis for color detection.

### 2.4 Security: File Hash Verification
- **Status:** 🟡 WARNING
- **Issue:** The Print Agent downloads files via signed URLs but does not verify the file integrity (e.g., via SHA-256 hash).
- **Impact:** Potential (though unlikely) MITM or storage-level tampering.
- **Recommendation:** Include the file hash in the `agent:job-assigned` event and verify it after download.

### 2.5 Scalability: Anonymous User Bloat
- **Status:** 🔵 IMPROVEMENT
- **Issue:** `AuthService.anonymousLogin()` creates a new database row for every guest session.
- **Impact:** Database bloat over time.
- **Recommendation:** Implement a cleanup job for guest accounts older than 24 hours.

## 3. Codebase Analysis

### 3.1 Architecture
- **Monorepo:** Well-structured using npm workspaces.
- **Backend:** Clean NestJS implementation with clear module separation.
- **Shared Package:** Correct use of `@quickprint/shared` for types and logic ensures consistency.
- **Agent:** Excellent use of a durable local queue (SQLite) to handle power failures or crashes.

### 3.2 Security
- **Auth:** JWT-based with RBAC is correctly implemented.
- **Storage:** HMAC signatures for local storage are robust.
- **Input Validation:** Proper use of `class-validator` in controllers.

### 3.3 Reliability
- **Retry Logic:** Agent has a solid retry mechanism (5 attempts) for hardware failures.
- **State Machine:** Job status transitions are logical but could benefit from stricter validation in `markPaidAndEnqueue`.

## 4. Completed Actions
- [x] **Top-to-bottom structural audit performed.**
- [x] **Code annotations added** to major service blocks in:
  - `PrintJobsService` (Backend)
  - `AuthService` (Backend)
  - `StorageService` (Backend)
  - `QueueProcessor` (Print Agent)
- [x] **Build health check executed** (Identified Next.js build issues).
- [x] **Test coverage analysis** (Identified 0% coverage).

## 5. Next Steps
1. **Fix Frontend Build:** Resolve the `<Html>` conflict in Next.js.
2. **Bootstrap Testing:** Add initial unit tests for `PricingService`.
3. **Implement Page Analysis:** Add real color detection to `PageAnalyzerService`.
