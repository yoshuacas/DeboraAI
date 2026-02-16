/*
  Warnings:

  - You are about to drop the column `description` on the `Case` table. All the data in the column will be lost.
  - You are about to drop the column `title` on the `Case` table. All the data in the column will be lost.
  - You are about to drop the column `userId` on the `Case` table. All the data in the column will be lost.
  - Added the required column `clientId` to the `Case` table without a default value. This is not possible if the table is not empty.
  - Added the required column `name` to the `Case` table without a default value. This is not possible if the table is not empty.

*/
-- CreateTable
CREATE TABLE "Client" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "email" TEXT NOT NULL,
    "firstName" TEXT NOT NULL,
    "lastName" TEXT NOT NULL,
    "phone" TEXT,
    "contactEmail" TEXT,
    "contactAddress" TEXT,
    "dateOfBirth" DATETIME,
    "idNumber" TEXT,
    "lawyerId" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Client_lawyerId_fkey" FOREIGN KEY ("lawyerId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "SupportDocument" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "fileUrl" TEXT NOT NULL,
    "fileType" TEXT NOT NULL,
    "summary" TEXT,
    "tags" TEXT NOT NULL,
    "caseId" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "SupportDocument_caseId_fkey" FOREIGN KEY ("caseId") REFERENCES "Case" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "GeneratedDocument" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "fileUrl" TEXT NOT NULL,
    "fileType" TEXT NOT NULL,
    "summary" TEXT,
    "tags" TEXT NOT NULL,
    "caseId" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "GeneratedDocument_caseId_fkey" FOREIGN KEY ("caseId") REFERENCES "Case" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "LibraryDocument" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "fileUrl" TEXT NOT NULL,
    "fileType" TEXT NOT NULL,
    "summary" TEXT,
    "tags" TEXT NOT NULL,
    "lawyerId" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "LibraryDocument_lawyerId_fkey" FOREIGN KEY ("lawyerId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Template" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "templateType" TEXT NOT NULL,
    "fileUrl" TEXT NOT NULL,
    "fileType" TEXT NOT NULL,
    "summary" TEXT,
    "tags" TEXT NOT NULL,
    "lawyerId" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Template_lawyerId_fkey" FOREIGN KEY ("lawyerId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "CalendarEvent" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "eventDate" DATETIME NOT NULL,
    "eventType" TEXT NOT NULL,
    "caseId" TEXT,
    "lawyerId" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "CalendarEvent_caseId_fkey" FOREIGN KEY ("caseId") REFERENCES "Case" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "CalendarEvent_lawyerId_fkey" FOREIGN KEY ("lawyerId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Case" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "court" TEXT,
    "status" TEXT NOT NULL DEFAULT 'OPEN',
    "clientId" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Case_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_Case" ("createdAt", "id", "status", "updatedAt") SELECT "createdAt", "id", "status", "updatedAt" FROM "Case";
DROP TABLE "Case";
ALTER TABLE "new_Case" RENAME TO "Case";
CREATE INDEX "Case_clientId_idx" ON "Case"("clientId");
CREATE INDEX "Case_status_idx" ON "Case"("status");
CREATE TABLE "new_User" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "email" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'CUSTOMER',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "firstName" TEXT,
    "lastName" TEXT,
    "phone" TEXT,
    "contactEmail" TEXT,
    "contactAddress" TEXT,
    "subscriptionPlan" TEXT NOT NULL DEFAULT 'FREE',
    "subscriptionEnds" DATETIME
);
INSERT INTO "new_User" ("createdAt", "email", "id", "name", "password", "role", "updatedAt") SELECT "createdAt", "email", "id", "name", "password", "role", "updatedAt" FROM "User";
DROP TABLE "User";
ALTER TABLE "new_User" RENAME TO "User";
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE INDEX "Client_lawyerId_idx" ON "Client"("lawyerId");

-- CreateIndex
CREATE INDEX "SupportDocument_caseId_idx" ON "SupportDocument"("caseId");

-- CreateIndex
CREATE INDEX "GeneratedDocument_caseId_idx" ON "GeneratedDocument"("caseId");

-- CreateIndex
CREATE INDEX "LibraryDocument_lawyerId_idx" ON "LibraryDocument"("lawyerId");

-- CreateIndex
CREATE INDEX "Template_lawyerId_idx" ON "Template"("lawyerId");

-- CreateIndex
CREATE INDEX "Template_templateType_idx" ON "Template"("templateType");

-- CreateIndex
CREATE INDEX "CalendarEvent_lawyerId_idx" ON "CalendarEvent"("lawyerId");

-- CreateIndex
CREATE INDEX "CalendarEvent_eventDate_idx" ON "CalendarEvent"("eventDate");

-- CreateIndex
CREATE INDEX "CalendarEvent_caseId_idx" ON "CalendarEvent"("caseId");
