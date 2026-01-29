# Compliance & Legal Requirements

## Overview

Voice AI calling in the United States is heavily regulated. This document outlines the compliance requirements and implementation strategies for VoxForge AI.

**DISCLAIMER:** This document is for informational purposes only and does not constitute legal advice. Consult with qualified legal counsel for compliance decisions.

---

## Key Regulations

### 1. Telephone Consumer Protection Act (TCPA)

The TCPA is the primary federal law governing telemarketing and automated calls.

#### Key Requirements

| Requirement | Description | Implementation |
|-------------|-------------|----------------|
| Prior Express Consent | Written consent before autodialed calls | Consent tracking system |
| Identification | Caller must identify themselves | Automatic disclosure at call start |
| Opt-Out | Honor opt-out requests | DNC list management |
| Time Restrictions | No calls before 8am or after 9pm local | Time zone aware scheduling |
| Caller ID | Must display valid caller ID | Verified phone numbers only |

#### Consent Types

```
Type 1: Prior Express Written Consent (PEWC)
- Required for: Marketing calls to cell phones
- Must include: Clear disclosure, signature, phone number
- Storage: Keep records for 5+ years

Type 2: Prior Express Consent
- Required for: Non-marketing automated calls
- Can be: Verbal or written
- Storage: Keep records for 5+ years

Type 3: Established Business Relationship (EBR)
- Allows: Calls to existing customers
- Timeframe: 18 months from last transaction
- Limitations: Still must honor DNC requests
```

#### Implementation

```typescript
// Consent tracking schema
model Consent {
  id              String   @id @default(cuid())
  organizationId  String
  contactPhone    String
  consentType     String   // PEWC, EXPRESS, EBR
  consentMethod   String   // web_form, verbal, paper
  consentText     String   // Exact disclosure shown
  ipAddress       String?  // For web forms
  timestamp       DateTime
  expiresAt       DateTime?
  revokedAt       DateTime?
  proofUrl        String?  // Link to signed form/recording
}

// Before making any call
async function validateConsent(phone: string, orgId: string): Promise<boolean> {
  const consent = await prisma.consent.findFirst({
    where: {
      contactPhone: phone,
      organizationId: orgId,
      revokedAt: null,
      OR: [
        { expiresAt: null },
        { expiresAt: { gt: new Date() } },
      ],
    },
    orderBy: { timestamp: 'desc' },
  });

  if (!consent) {
    throw new Error('No valid consent on file');
  }

  return true;
}
```

---

### 2. Do Not Call (DNC) Registry

#### National DNC Registry

| Requirement | Description |
|-------------|-------------|
| Registration | Must register with FTC to access list |
| Scrubbing | Scrub lists every 31 days minimum |
| Fees | $72/area code, $23,331 for all area codes |
| Exemptions | Existing customers, non-profits, surveys |

#### Internal DNC List

```typescript
// DNC management
model DNCEntry {
  id              String   @id @default(cuid())
  organizationId  String
  phoneNumber     String
  source          String   // national, internal, verbal_request
  addedAt         DateTime @default(now())
  addedBy         String?  // user or system
  reason          String?
  
  @@unique([organizationId, phoneNumber])
}

// Scrub contacts against DNC
async function scrubAgainstDNC(
  contacts: Contact[],
  orgId: string
): Promise<Contact[]> {
  const dncNumbers = await prisma.dNCEntry.findMany({
    where: { organizationId: orgId },
    select: { phoneNumber: true },
  });

  const dncSet = new Set(dncNumbers.map((d) => d.phoneNumber));

  return contacts.filter((c) => !dncSet.has(normalizePhone(c.phone)));
}
```

#### Opt-Out Handling

```typescript
// Automatic opt-out detection during calls
const OPT_OUT_PHRASES = [
  'stop calling',
  'take me off your list',
  'do not call',
  'remove my number',
  'unsubscribe',
  'opt out',
];

// Vapi function for handling opt-outs
async function handleOptOutRequest(callId: string, transcript: string) {
  const hasOptOut = OPT_OUT_PHRASES.some((phrase) =>
    transcript.toLowerCase().includes(phrase)
  );

  if (hasOptOut) {
    const call = await prisma.call.findUnique({ where: { id: callId } });
    
    // Add to DNC immediately
    await prisma.dNCEntry.upsert({
      where: {
        organizationId_phoneNumber: {
          organizationId: call.organizationId,
          phoneNumber: call.toNumber,
        },
      },
      create: {
        organizationId: call.organizationId,
        phoneNumber: call.toNumber,
        source: 'verbal_request',
        reason: 'Opt-out during call',
      },
      update: {
        addedAt: new Date(),
        reason: 'Opt-out during call (updated)',
      },
    });

    // Log compliance event
    await logComplianceEvent({
      type: 'OPT_OUT_REQUEST',
      callId,
      phoneNumber: call.toNumber,
      transcript: transcript.slice(-500), // Last 500 chars
    });
  }
}
```

---

### 3. AI Disclosure Requirements

#### FTC AI Disclosure Rule (2024)

As of 2024, the FTC requires disclosure when AI is used in telemarketing.

```typescript
// Required disclosure at start of every call
const AI_DISCLOSURE = `
Hello, this is an AI assistant calling on behalf of {company_name}. 
This call may be recorded for quality and training purposes.
`;

// Vapi assistant configuration
const assistantConfig = {
  firstMessage: AI_DISCLOSURE.replace('{company_name}', orgName),
  // ... rest of config
};
```

#### State-Specific AI Laws

| State | Requirement |
|-------|-------------|
| California | Disclose AI at start, provide human option |
| New York | Pending legislation |
| Illinois | BIPA considerations for voice |
| Texas | Explicit consent for recordings |

---

### 4. State-Specific Regulations

#### Key State Laws

| State | Law | Key Requirements |
|-------|-----|------------------|
| California | CCPA/CPRA | Privacy rights, opt-out, data deletion |
| Florida | FCCPA | Stricter than federal, 8am-8pm calls |
| New York | TCPA-NY | Additional consent requirements |
| Texas | TCPA-TX | Explicit recording consent |
| Washington | WCPA | Strong privacy protections |

#### Implementation

```typescript
// State-specific calling rules
const STATE_RULES = {
  FL: {
    callingHours: { start: 8, end: 20 }, // 8am-8pm
    requiresExplicitRecordingConsent: true,
  },
  CA: {
    callingHours: { start: 8, end: 21 },
    requiresExplicitRecordingConsent: true,
    additionalDisclosure: 'This call is being recorded.',
  },
  TX: {
    callingHours: { start: 8, end: 21 },
    requiresExplicitRecordingConsent: true,
    twoPartyConsentState: true,
  },
  // Default federal rules
  DEFAULT: {
    callingHours: { start: 8, end: 21 },
    requiresExplicitRecordingConsent: false,
  },
};

function getStateRules(state: string) {
  return STATE_RULES[state] || STATE_RULES.DEFAULT;
}

function canCallNow(state: string, localTime: Date): boolean {
  const rules = getStateRules(state);
  const hour = localTime.getHours();
  return hour >= rules.callingHours.start && hour < rules.callingHours.end;
}
```

---

### 5. Recording Consent

#### Two-Party vs One-Party Consent States

```
One-Party Consent States (Federal Default):
Most states - only one party needs to know about recording

Two-Party/All-Party Consent States:
California, Connecticut, Florida, Illinois, Maryland,
Massachusetts, Michigan, Montana, Nevada, New Hampshire,
Pennsylvania, Vermont, Washington

For these states: MUST disclose recording at call start
```

#### Implementation

```typescript
const TWO_PARTY_CONSENT_STATES = [
  'CA', 'CT', 'FL', 'IL', 'MD', 'MA', 'MI', 'MT', 'NV', 'NH', 'PA', 'VT', 'WA'
];

function getRecordingDisclosure(state: string): string {
  if (TWO_PARTY_CONSENT_STATES.includes(state)) {
    return 'This call is being recorded for quality assurance purposes. ' +
           'By continuing this call, you consent to being recorded.';
  }
  return ''; // One-party state, no disclosure required
}

// Modify first message based on state
function buildFirstMessage(orgName: string, contactState: string): string {
  let message = `Hello, this is an AI assistant calling on behalf of ${orgName}. `;
  
  const recordingDisclosure = getRecordingDisclosure(contactState);
  if (recordingDisclosure) {
    message += recordingDisclosure + ' ';
  }
  
  message += 'How can I help you today?';
  
  return message;
}
```

---

## Data Privacy

### GDPR Considerations

If serving EU customers or EU data subjects:

| Requirement | Implementation |
|-------------|----------------|
| Lawful Basis | Document consent or legitimate interest |
| Data Minimization | Only collect necessary data |
| Right to Access | Data export functionality |
| Right to Deletion | Data deletion capability |
| Data Portability | Export in machine-readable format |
| Breach Notification | 72-hour notification process |

### CCPA/CPRA Compliance

For California residents:

```typescript
// Privacy rights implementation
class PrivacyService {
  // Right to know
  async getPersonalData(userId: string) {
    return {
      profile: await prisma.user.findUnique({ where: { id: userId } }),
      calls: await prisma.call.findMany({ where: { userId } }),
      consents: await prisma.consent.findMany({ where: { userId } }),
    };
  }

  // Right to delete
  async deletePersonalData(userId: string) {
    await prisma.$transaction([
      prisma.call.deleteMany({ where: { userId } }),
      prisma.consent.deleteMany({ where: { userId } }),
      prisma.user.delete({ where: { id: userId } }),
    ]);
  }

  // Right to opt-out of sale
  async optOutOfSale(userId: string) {
    await prisma.user.update({
      where: { id: userId },
      data: { doNotSellData: true },
    });
  }
}
```

### Data Retention Policy

```typescript
const RETENTION_POLICIES = {
  callRecordings: {
    default: 90,      // days
    enterprise: 365,
    minimum: 30,      // compliance minimum
  },
  transcripts: {
    default: 180,
    enterprise: 730,  // 2 years
  },
  consentRecords: {
    default: 1825,    // 5 years (TCPA requirement)
  },
  auditLogs: {
    default: 2555,    // 7 years
  },
};
```

---

## Industry-Specific Compliance

### Healthcare (HIPAA)

If handling Protected Health Information (PHI):

| Requirement | Implementation |
|-------------|----------------|
| BAA | Business Associate Agreement with Vapi |
| Encryption | TLS 1.3 in transit, AES-256 at rest |
| Access Controls | Role-based, audit logged |
| Minimum Necessary | Only access required PHI |

```typescript
// HIPAA-compliant call handling
const HIPAA_CONFIG = {
  // Don't store PHI in transcripts
  transcriptRedaction: {
    patterns: [
      /\b\d{3}-\d{2}-\d{4}\b/g,  // SSN
      /\b\d{9}\b/g,               // MRN patterns
      /\b[A-Z]{2}\d{7}\b/g,       // Insurance IDs
    ],
    replacement: '[REDACTED]',
  },
  
  // Automatic PHI detection
  phiKeywords: [
    'diagnosis', 'prescription', 'medication',
    'symptoms', 'treatment', 'medical record',
  ],
};

function redactPHI(transcript: string): string {
  let redacted = transcript;
  for (const pattern of HIPAA_CONFIG.transcriptRedaction.patterns) {
    redacted = redacted.replace(pattern, HIPAA_CONFIG.transcriptRedaction.replacement);
  }
  return redacted;
}
```

### Financial Services

For insurance, lending, debt collection:

| Regulation | Requirement |
|------------|-------------|
| FDCPA | Debt collection rules, mini-Miranda |
| GLBA | Financial privacy protections |
| TCPA-Insurance | State-specific insurance rules |

```typescript
// FDCPA Mini-Miranda for debt collection
const FDCPA_DISCLOSURE = `
This is an attempt to collect a debt and any information 
obtained will be used for that purpose. This communication 
is from a debt collector.
`;

// Must be disclosed in first communication
```

### Real Estate

For real estate calls:

| Requirement | Description |
|-------------|-------------|
| Do Not Call | Must honor DNC lists |
| Fair Housing | No discriminatory practices |
| Licensing | May need broker supervision |

---

## Compliance Dashboard

### Required Tracking

```typescript
// Compliance metrics to track
interface ComplianceMetrics {
  // DNC compliance
  dncViolationAttempts: number;
  optOutsProcessed: number;
  dncListAge: Date;       // When last updated
  
  // Consent
  callsWithConsent: number;
  callsWithoutConsent: number;
  expiredConsents: number;
  
  // Time violations
  outOfHoursAttempts: number;
  
  // Disclosure compliance
  callsWithDisclosure: number;
  callsWithoutDisclosure: number;
  
  // Data requests
  dataExportRequests: number;
  dataDeletionRequests: number;
}

// Daily compliance report
async function generateComplianceReport(orgId: string, date: Date) {
  const startOfDay = startOfDay(date);
  const endOfDay = endOfDay(date);

  return {
    totalCalls: await prisma.call.count({
      where: { organizationId: orgId, createdAt: { gte: startOfDay, lt: endOfDay } },
    }),
    
    dncViolations: await prisma.complianceEvent.count({
      where: {
        organizationId: orgId,
        type: 'DNC_VIOLATION_ATTEMPT',
        timestamp: { gte: startOfDay, lt: endOfDay },
      },
    }),
    
    optOutsReceived: await prisma.dNCEntry.count({
      where: {
        organizationId: orgId,
        source: 'verbal_request',
        addedAt: { gte: startOfDay, lt: endOfDay },
      },
    }),
    
    // ... more metrics
  };
}
```

### Audit Logging

```typescript
// All compliance-relevant events must be logged
model ComplianceEvent {
  id              String   @id @default(cuid())
  organizationId  String
  type            String   // DNC_CHECK, CONSENT_VERIFIED, OPT_OUT, etc.
  callId          String?
  phoneNumber     String?
  userId          String?
  details         Json
  timestamp       DateTime @default(now())
  
  @@index([organizationId, timestamp])
  @@index([type, timestamp])
}

// Log all compliance events
async function logComplianceEvent(event: {
  type: string;
  orgId: string;
  callId?: string;
  phoneNumber?: string;
  details?: any;
}) {
  await prisma.complianceEvent.create({
    data: {
      organizationId: event.orgId,
      type: event.type,
      callId: event.callId,
      phoneNumber: event.phoneNumber,
      details: event.details || {},
    },
  });
}
```

---

## Compliance Checklist

### Before Launch

- [ ] Register with FTC for DNC access
- [ ] Implement DNC scrubbing
- [ ] Build consent collection system
- [ ] Add AI disclosure to all calls
- [ ] Implement time-of-day restrictions
- [ ] Set up recording consent by state
- [ ] Create opt-out handling
- [ ] Build compliance audit logging
- [ ] Draft Terms of Service
- [ ] Draft Privacy Policy
- [ ] Consult with telecommunications attorney

### Ongoing

- [ ] Scrub against national DNC (every 31 days)
- [ ] Review opt-out requests (daily)
- [ ] Monitor compliance metrics (weekly)
- [ ] Audit call recordings (monthly)
- [ ] Update DNC list subscription (annually)
- [ ] Review state law changes (quarterly)
- [ ] Train team on compliance (quarterly)

### Documentation Required

| Document | Purpose | Update Frequency |
|----------|---------|------------------|
| Terms of Service | User agreement | As needed |
| Privacy Policy | Data handling disclosure | As needed |
| Consent Forms | TCPA compliance | As needed |
| DNC Policy | Internal procedures | Annually |
| Data Retention Policy | Compliance documentation | Annually |
| Incident Response Plan | Breach handling | Annually |

---

## Violations & Penalties

### TCPA Penalties

| Violation Type | Penalty Per Call |
|----------------|------------------|
| Negligent violation | $500 |
| Willful violation | $1,500 |
| Class action potential | Unlimited |

**Real Examples:**
- Capital One: $75.5M settlement (2015)
- Dish Network: $280M judgment (2017)
- Facebook: $90M settlement (2022)

### Risk Mitigation

1. **Document Everything** - Consent, opt-outs, disclosures
2. **Train Users** - Compliance training for all customers
3. **Audit Regularly** - Review calls and procedures
4. **Respond Quickly** - Address complaints immediately
5. **Insurance** - Errors & omissions coverage

---

## Vendor Compliance

### Vapi.ai Compliance

Ensure Vapi.ai:
- [ ] Has BAA available (for HIPAA)
- [ ] Is SOC 2 compliant
- [ ] Has data processing agreement
- [ ] Supports call recording consent
- [ ] Can handle opt-out requests

### Subprocessor Management

| Vendor | Purpose | DPA Required |
|--------|---------|--------------|
| Vapi.ai | Voice AI | Yes |
| Twilio | Telephony | Yes |
| Stripe | Payments | Yes |
| Supabase | Database | Yes |
| OpenAI | AI processing | Yes |

---

## Emergency Procedures

### Data Breach Response

1. **Identify** - Determine scope of breach
2. **Contain** - Stop ongoing access
3. **Notify** - Affected parties within 72 hours
4. **Report** - To regulators as required
5. **Remediate** - Fix vulnerability
6. **Review** - Post-incident analysis

### Complaint Response

1. **Acknowledge** - Within 24 hours
2. **Investigate** - Review call records
3. **Respond** - To complainant
4. **Document** - All actions taken
5. **Remediate** - Add to DNC, refund if appropriate
