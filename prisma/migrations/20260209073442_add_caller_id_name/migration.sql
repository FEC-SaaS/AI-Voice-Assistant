-- AlterTable
ALTER TABLE "Agent" ALTER COLUMN "model" SET DEFAULT 'gpt-4o';

-- AlterTable
ALTER TABLE "Appointment" ADD COLUMN     "notificationPreference" TEXT,
ADD COLUMN     "smsReminderSentAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "Contact" ADD COLUMN     "notificationPreference" TEXT NOT NULL DEFAULT 'both';

-- AlterTable
ALTER TABLE "PhoneNumber" ADD COLUMN     "callerIdName" TEXT;

-- CreateTable
CREATE TABLE "AuditLog" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT,
    "userId" TEXT,
    "details" JSONB NOT NULL DEFAULT '{}',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Department" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "phoneNumber" TEXT,
    "extension" TEXT,
    "email" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "businessHours" JSONB NOT NULL DEFAULT '{}',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Department_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StaffMember" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "departmentId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "role" TEXT,
    "phoneNumber" TEXT,
    "email" TEXT,
    "isAvailable" BOOLEAN NOT NULL DEFAULT true,
    "availabilitySchedule" JSONB NOT NULL DEFAULT '{}',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "StaffMember_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ReceptionistMessage" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "agentId" TEXT,
    "callId" TEXT,
    "departmentId" TEXT,
    "staffMemberId" TEXT,
    "callerName" TEXT,
    "callerPhone" TEXT,
    "callerEmail" TEXT,
    "callerCompany" TEXT,
    "subject" TEXT,
    "body" TEXT NOT NULL,
    "urgency" TEXT NOT NULL DEFAULT 'normal',
    "status" TEXT NOT NULL DEFAULT 'new',
    "forwardedAt" TIMESTAMP(3),
    "forwardedVia" TEXT,
    "resolvedAt" TIMESTAMP(3),
    "resolvedBy" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ReceptionistMessage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MissedCall" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "agentId" TEXT,
    "callerNumber" TEXT NOT NULL,
    "calledNumber" TEXT,
    "reason" TEXT NOT NULL DEFAULT 'no_answer',
    "vapiCallId" TEXT,
    "textBackSent" BOOLEAN NOT NULL DEFAULT false,
    "textBackSentAt" TIMESTAMP(3),
    "textBackMessage" TEXT,
    "callbackInitiated" BOOLEAN NOT NULL DEFAULT false,
    "callbackAt" TIMESTAMP(3),
    "callbackCallId" TEXT,
    "contactCreated" BOOLEAN NOT NULL DEFAULT false,
    "contactId" TEXT,
    "isDuplicate" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MissedCall_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "AuditLog_organizationId_idx" ON "AuditLog"("organizationId");

-- CreateIndex
CREATE INDEX "AuditLog_action_idx" ON "AuditLog"("action");

-- CreateIndex
CREATE INDEX "AuditLog_entityType_entityId_idx" ON "AuditLog"("entityType", "entityId");

-- CreateIndex
CREATE INDEX "AuditLog_createdAt_idx" ON "AuditLog"("createdAt");

-- CreateIndex
CREATE INDEX "Department_organizationId_idx" ON "Department"("organizationId");

-- CreateIndex
CREATE UNIQUE INDEX "Department_organizationId_name_key" ON "Department"("organizationId", "name");

-- CreateIndex
CREATE INDEX "StaffMember_organizationId_idx" ON "StaffMember"("organizationId");

-- CreateIndex
CREATE INDEX "StaffMember_departmentId_idx" ON "StaffMember"("departmentId");

-- CreateIndex
CREATE INDEX "ReceptionistMessage_organizationId_idx" ON "ReceptionistMessage"("organizationId");

-- CreateIndex
CREATE INDEX "ReceptionistMessage_status_idx" ON "ReceptionistMessage"("status");

-- CreateIndex
CREATE INDEX "ReceptionistMessage_urgency_idx" ON "ReceptionistMessage"("urgency");

-- CreateIndex
CREATE INDEX "ReceptionistMessage_departmentId_idx" ON "ReceptionistMessage"("departmentId");

-- CreateIndex
CREATE INDEX "ReceptionistMessage_staffMemberId_idx" ON "ReceptionistMessage"("staffMemberId");

-- CreateIndex
CREATE INDEX "ReceptionistMessage_createdAt_idx" ON "ReceptionistMessage"("createdAt");

-- CreateIndex
CREATE INDEX "MissedCall_organizationId_idx" ON "MissedCall"("organizationId");

-- CreateIndex
CREATE INDEX "MissedCall_callerNumber_idx" ON "MissedCall"("callerNumber");

-- CreateIndex
CREATE INDEX "MissedCall_agentId_idx" ON "MissedCall"("agentId");

-- CreateIndex
CREATE INDEX "MissedCall_createdAt_idx" ON "MissedCall"("createdAt");

-- CreateIndex
CREATE INDEX "MissedCall_textBackSent_idx" ON "MissedCall"("textBackSent");

-- AddForeignKey
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Department" ADD CONSTRAINT "Department_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StaffMember" ADD CONSTRAINT "StaffMember_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StaffMember" ADD CONSTRAINT "StaffMember_departmentId_fkey" FOREIGN KEY ("departmentId") REFERENCES "Department"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReceptionistMessage" ADD CONSTRAINT "ReceptionistMessage_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReceptionistMessage" ADD CONSTRAINT "ReceptionistMessage_agentId_fkey" FOREIGN KEY ("agentId") REFERENCES "Agent"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReceptionistMessage" ADD CONSTRAINT "ReceptionistMessage_departmentId_fkey" FOREIGN KEY ("departmentId") REFERENCES "Department"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReceptionistMessage" ADD CONSTRAINT "ReceptionistMessage_staffMemberId_fkey" FOREIGN KEY ("staffMemberId") REFERENCES "StaffMember"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MissedCall" ADD CONSTRAINT "MissedCall_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MissedCall" ADD CONSTRAINT "MissedCall_agentId_fkey" FOREIGN KEY ("agentId") REFERENCES "Agent"("id") ON DELETE SET NULL ON UPDATE CASCADE;
