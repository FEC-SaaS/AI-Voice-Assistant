# REST API

Use the VoxForge REST API to build custom integrations, trigger calls programmatically, sync data with your own systems, and automate workflows — all without touching the dashboard.

---

## Getting Started

### 1. Create an API Key

Go to **Settings → API Keys** and click **Create API Key**. Give it a name that describes what it will be used for (e.g. "CRM Sync", "Internal Automation").

Copy the key immediately — it will only be shown once.

> **Tip:** You can create multiple keys for different use cases and revoke them independently.

### 2. Make your first request

```bash
curl -X GET "https://your-domain.com/api/v1/agents" \
  -H "Authorization: Bearer YOUR_API_KEY"
```

All requests must include:

```http
Authorization: Bearer YOUR_API_KEY
Content-Type: application/json   # required for POST/PATCH
```

---

## Agents

Agents are AI voice personalities that handle your calls. Each agent has a name, voice, system prompt, and behavior settings.

### List agents

```http
GET /api/v1/agents
```

```json
[
  {
    "id": "clx...",
    "name": "Sales Rep - Sarah",
    "isActive": true,
    "voice": "jennifer",
    "firstMessage": "Hi, this is Sarah calling from Acme...",
    "createdAt": "2025-01-01T00:00:00Z"
  }
]
```

### Get an agent

```http
GET /api/v1/agents/:id
```

### Create an agent

```http
POST /api/v1/agents
```

```json
{
  "name": "Support Agent",
  "systemPrompt": "You are a helpful support agent for Acme Corp...",
  "firstMessage": "Hi, this is Acme support. How can I help you today?",
  "voice": "jennifer",
  "language": "en-US",
  "maxCallDuration": 600
}
```

### Update an agent

```http
PATCH /api/v1/agents/:id
```

Send only the fields you want to change:

```json
{ "name": "New Name", "isActive": false }
```

### Delete an agent

```http
DELETE /api/v1/agents/:id
```

---

## Campaigns

Campaigns let you run outbound calling at scale — dialing a list of contacts using a specific agent and phone number.

### List campaigns

```http
GET /api/v1/campaigns
```

```json
[
  {
    "id": "clx...",
    "name": "Q1 Outreach",
    "status": "active",
    "callsTotal": 500,
    "callsCompleted": 230,
    "createdAt": "2025-01-01T00:00:00Z"
  }
]
```

### Get a campaign

```http
GET /api/v1/campaigns/:id
```

### Create a campaign

```http
POST /api/v1/campaigns
```

```json
{
  "name": "February Outreach",
  "agentId": "clx...",
  "phoneNumberId": "clx...",
  "scheduledStart": "2025-02-01T09:00:00Z",
  "timezone": "America/New_York",
  "callWindow": { "start": "09:00", "end": "17:00" },
  "maxConcurrentCalls": 3
}
```

### Pause / resume / cancel

```http
PATCH /api/v1/campaigns/:id
```

```json
{ "status": "paused" }
```

Valid statuses: `active` · `paused` · `completed` · `cancelled`

---

## Calls

### List calls

```http
GET /api/v1/calls
```

**Filters (query string)**

| Parameter | Description |
|-----------|-------------|
| `limit` | Max results per page (default: 50, max: 200) |
| `offset` | Pagination offset |
| `status` | `queued` · `in-progress` · `completed` · `failed` |
| `agentId` | Filter by agent |
| `campaignId` | Filter by campaign |
| `from` | Start date (ISO 8601) |
| `to` | End date (ISO 8601) |

```json
{
  "calls": [
    {
      "id": "clx...",
      "status": "completed",
      "direction": "outbound",
      "to": "+15551234567",
      "duration": 183,
      "summary": "Prospect interested in a demo next week.",
      "sentiment": "positive",
      "recordingUrl": "https://...",
      "createdAt": "2025-01-15T14:23:00Z"
    }
  ],
  "total": 1523,
  "limit": 50,
  "offset": 0
}
```

### Get a call

```http
GET /api/v1/calls/:id
```

Returns full call details including the transcript and AI analysis.

### Trigger a call

Initiate a single outbound call programmatically:

```http
POST /api/v1/calls
```

```json
{
  "agentId": "clx...",
  "phoneNumberId": "clx...",
  "to": "+15551234567"
}
```

---

## Appointments

### List appointments

```http
GET /api/v1/appointments?status=confirmed&from=2025-02-01&to=2025-02-28
```

### Get an appointment

```http
GET /api/v1/appointments/:id
```

### Create an appointment

```http
POST /api/v1/appointments
```

```json
{
  "contactId": "clx...",
  "startTime": "2025-02-15T10:00:00Z",
  "endTime": "2025-02-15T10:30:00Z",
  "title": "Product Demo",
  "notes": "Prospect is interested in the CRM integration"
}
```

### Update an appointment

```http
PATCH /api/v1/appointments/:id
```

```json
{ "status": "cancelled" }
```

---

## Webhooks

VoxForge sends real-time event notifications to your server whenever something happens — a call starts, ends, a transcript is ready, etc.

### Setting up a webhook endpoint

1. Go to **Integrations → Webhooks**
2. Click **Add Endpoint**
3. Enter your server URL (must be publicly accessible HTTPS)
4. Select the events you want to receive
5. Copy the signing secret — you'll use this to verify requests

### Event types

| Event | When it fires |
|-------|---------------|
| `call.started` | A call has been initiated |
| `call.ended` | A call has completed |
| `call.failed` | A call could not connect |
| `transcript.ready` | Transcript is processed and available |
| `analysis.complete` | AI analysis (sentiment, summary) is ready |

### Payload format

```json
{
  "event": "call.ended",
  "timestamp": "2025-01-15T14:25:00Z",
  "data": {
    "callId": "clx...",
    "status": "completed",
    "duration": 183,
    "to": "+15551234567",
    "agentId": "clx...",
    "campaignId": "clx..."
  }
}
```

### Verifying webhook signatures

Every request includes a signature header so you can confirm it came from VoxForge:

```
X-VoxForge-Signature: sha256=abc123...
```

**Node.js verification example:**

```javascript
const crypto = require("crypto");

function isValidWebhook(rawBody, signatureHeader, secret) {
  const expected = crypto
    .createHmac("sha256", secret)
    .update(rawBody)
    .digest("hex");
  return `sha256=${expected}` === signatureHeader;
}

// Express handler
app.post("/webhook", express.raw({ type: "application/json" }), (req, res) => {
  const sig = req.headers["x-voxforge-signature"];

  if (!isValidWebhook(req.body.toString(), sig, process.env.WEBHOOK_SECRET)) {
    return res.status(401).json({ error: "Invalid signature" });
  }

  const event = JSON.parse(req.body.toString());
  console.log("Received:", event.event);

  res.sendStatus(200);
});
```

**Python verification example:**

```python
import hmac, hashlib

def is_valid_webhook(raw_body: bytes, signature: str, secret: str) -> bool:
    expected = hmac.new(
        secret.encode(), raw_body, hashlib.sha256
    ).hexdigest()
    return f"sha256={expected}" == signature
```

> Always return `200 OK` quickly. If your handler takes more than 10 seconds, VoxForge will retry the delivery.

### Retry policy

Failed deliveries (non-2xx response or timeout) are retried with exponential backoff:

| Attempt | Delay |
|---------|-------|
| 1st retry | 30 seconds |
| 2nd retry | 5 minutes |
| 3rd retry | 30 minutes |
| 4th retry | 2 hours |

After 4 failed attempts, the delivery is marked as failed. You can view delivery logs in **Integrations → Webhooks → Logs**.

---

## Error Handling

All errors follow a consistent format:

```json
{
  "error": {
    "code": "NOT_FOUND",
    "message": "Agent with id clx... not found"
  }
}
```

| Status | Code | Meaning |
|--------|------|---------|
| `400` | `BAD_REQUEST` | Invalid parameters |
| `401` | `UNAUTHORIZED` | Missing or invalid API key |
| `403` | `FORBIDDEN` | Key lacks permission or IP is restricted |
| `404` | `NOT_FOUND` | Resource not found |
| `422` | `LIMIT_REACHED` | Plan limit reached (e.g. max agents) |
| `429` | `RATE_LIMITED` | Too many requests — slow down |
| `500` | `INTERNAL_ERROR` | Something went wrong on our end |

---

## Rate Limits

Rate limits apply per API key. Response headers tell you your current usage:

```
X-RateLimit-Limit: 300
X-RateLimit-Remaining: 287
X-RateLimit-Reset: 1706745660
```

| Plan | Requests / minute |
|------|-------------------|
| Starter | 60 |
| Professional | 300 |
| Business | 600 |
| Enterprise | Unlimited |

If you exceed the limit, you'll receive a `429` response. Wait until `X-RateLimit-Reset` before retrying.

---

## API Key Security

- **Rotate keys** regularly in Settings → API Keys
- **Use IP allowlists** to restrict a key to specific server IPs
- **Create separate keys** for each integration so you can revoke them independently
- Never expose API keys in client-side code or public repositories
