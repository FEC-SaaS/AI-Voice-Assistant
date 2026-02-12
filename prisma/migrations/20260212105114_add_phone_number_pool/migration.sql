/*
  Warnings:

  - You are about to drop the `MissedCall` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "MissedCall" DROP CONSTRAINT "MissedCall_agentId_fkey";

-- DropForeignKey
ALTER TABLE "MissedCall" DROP CONSTRAINT "MissedCall_organizationId_fkey";

-- AlterTable
ALTER TABLE "Agent" ALTER COLUMN "voiceProvider" SET DEFAULT 'vapi',
ALTER COLUMN "voiceId" SET DEFAULT 'Elliot';

-- AlterTable
ALTER TABLE "PhoneNumber" ADD COLUMN     "cnamSid" TEXT,
ADD COLUMN     "cnamStatus" TEXT;

-- DropTable
DROP TABLE "MissedCall";

-- CreateTable
CREATE TABLE "CnamProfile" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "businessName" TEXT NOT NULL,
    "businessType" TEXT NOT NULL,
    "ein" TEXT,
    "businessAddress" TEXT NOT NULL,
    "businessCity" TEXT NOT NULL,
    "businessState" TEXT NOT NULL,
    "businessZip" TEXT NOT NULL,
    "businessCountry" TEXT NOT NULL DEFAULT 'US',
    "contactFirstName" TEXT NOT NULL,
    "contactLastName" TEXT NOT NULL,
    "contactEmail" TEXT NOT NULL,
    "contactPhone" TEXT NOT NULL,
    "customerProfileSid" TEXT,
    "endUserSid" TEXT,
    "trustProductSid" TEXT,
    "policySid" TEXT,
    "status" TEXT NOT NULL DEFAULT 'draft',
    "rejectionReason" TEXT,
    "approvedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CnamProfile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LandingEvent" (
    "id" TEXT NOT NULL,
    "event" TEXT NOT NULL,
    "agent" TEXT,
    "duration" INTEGER,
    "location" TEXT,
    "userAgent" TEXT,
    "sessionId" TEXT,
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LandingEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PhoneNumberPool" (
    "id" TEXT NOT NULL,
    "twilioSid" TEXT NOT NULL,
    "number" TEXT NOT NULL,
    "friendlyName" TEXT,
    "type" TEXT NOT NULL DEFAULT 'local',
    "countryCode" TEXT NOT NULL DEFAULT 'US',
    "areaCode" TEXT,
    "region" TEXT,
    "locality" TEXT,
    "status" TEXT NOT NULL DEFAULT 'available',
    "organizationId" TEXT,
    "assignedAt" TIMESTAMP(3),
    "monthlyCost" INTEGER NOT NULL DEFAULT 0,
    "saasMonthlyCost" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PhoneNumberPool_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "CnamProfile_organizationId_key" ON "CnamProfile"("organizationId");

-- CreateIndex
CREATE INDEX "CnamProfile_organizationId_idx" ON "CnamProfile"("organizationId");

-- CreateIndex
CREATE INDEX "CnamProfile_status_idx" ON "CnamProfile"("status");

-- CreateIndex
CREATE INDEX "LandingEvent_event_idx" ON "LandingEvent"("event");

-- CreateIndex
CREATE INDEX "LandingEvent_createdAt_idx" ON "LandingEvent"("createdAt");

-- CreateIndex
CREATE INDEX "LandingEvent_agent_idx" ON "LandingEvent"("agent");

-- CreateIndex
CREATE UNIQUE INDEX "PhoneNumberPool_twilioSid_key" ON "PhoneNumberPool"("twilioSid");

-- CreateIndex
CREATE UNIQUE INDEX "PhoneNumberPool_number_key" ON "PhoneNumberPool"("number");

-- CreateIndex
CREATE INDEX "PhoneNumberPool_status_idx" ON "PhoneNumberPool"("status");

-- CreateIndex
CREATE INDEX "PhoneNumberPool_countryCode_type_idx" ON "PhoneNumberPool"("countryCode", "type");

-- CreateIndex
CREATE INDEX "PhoneNumberPool_organizationId_idx" ON "PhoneNumberPool"("organizationId");

-- AddForeignKey
ALTER TABLE "CnamProfile" ADD CONSTRAINT "CnamProfile_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PhoneNumberPool" ADD CONSTRAINT "PhoneNumberPool_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE SET NULL ON UPDATE CASCADE;
