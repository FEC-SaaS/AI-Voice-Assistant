import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

export const metadata: Metadata = {
  title: "API Reference | CallTone Documentation",
  description:
    "Complete REST API reference for the CallTone platform. Authenticate, manage agents, initiate calls, and run campaigns programmatically.",
};

export default function ApiReferencePage() {
  return (
    <>
      {/* Hero */}
      <section className="bg-gradient-to-b from-secondary to-background py-16">
        <div className="container mx-auto px-4 text-center">
          <h1 className="text-4xl font-bold tracking-tight text-foreground sm:text-5xl">
            API Reference
          </h1>
          <p className="mx-auto mt-4 max-w-2xl text-lg text-muted-foreground">
            Integrate CallTone into your stack with our RESTful JSON API.
          </p>
        </div>
      </section>

      {/* Content */}
      <section className="py-16">
        <div className="container mx-auto max-w-3xl px-4">
          <Link
            href="/docs"
            className="inline-flex items-center text-sm font-medium text-primary hover:underline"
          >
            <ArrowLeft className="mr-1 h-4 w-4" />
            Back to Documentation
          </Link>

          <div className="prose prose-neutral dark:prose-invert mt-8 max-w-none space-y-8">
            {/* Base URL */}
            <div>
              <h2 className="text-2xl font-semibold text-foreground">
                Base URL
              </h2>
              <p className="mt-3 text-muted-foreground leading-relaxed">
                All API requests are made to the following base URL. HTTPS is
                required for every request.
              </p>
              <pre className="mt-3 rounded bg-secondary p-4 text-sm overflow-x-auto">
                <code>https://calltone.ai/api/v1</code>
              </pre>
            </div>

            {/* Authentication */}
            <div>
              <h2 className="text-2xl font-semibold text-foreground">
                Authentication
              </h2>
              <p className="mt-3 text-muted-foreground leading-relaxed">
                Authenticate by including your API key in the{" "}
                <code className="rounded bg-secondary px-1.5 py-0.5 text-sm">
                  Authorization
                </code>{" "}
                header as a Bearer token. API keys are prefixed with{" "}
                <code className="rounded bg-secondary px-1.5 py-0.5 text-sm">
                  vxf_
                </code>{" "}
                and can be created in{" "}
                <strong className="text-foreground">
                  Settings &rarr; API Keys
                </strong>
                .
              </p>
              <pre className="mt-3 rounded bg-secondary p-4 text-sm overflow-x-auto">
                <code>{`Authorization: Bearer vxf_your_api_key_here`}</code>
              </pre>
              <p className="mt-3 text-muted-foreground leading-relaxed">
                Keep your API key secret. Do not expose it in client-side code
                or public repositories. If you believe a key has been
                compromised, revoke it immediately from the dashboard and
                generate a new one.
              </p>
            </div>

            {/* Rate Limits */}
            <div>
              <h2 className="text-2xl font-semibold text-foreground">
                Rate Limits
              </h2>
              <p className="mt-3 text-muted-foreground leading-relaxed">
                The API enforces a rate limit of{" "}
                <strong className="text-foreground">
                  100 requests per minute
                </strong>{" "}
                per API key. When you exceed the limit you will receive a{" "}
                <code className="rounded bg-secondary px-1.5 py-0.5 text-sm">
                  429 Too Many Requests
                </code>{" "}
                response. Rate-limit headers are included on every response:
              </p>
              <pre className="mt-3 rounded bg-secondary p-4 text-sm overflow-x-auto">
                <code>{`X-RateLimit-Limit: 100
X-RateLimit-Remaining: 87
X-RateLimit-Reset: 1707500000`}</code>
              </pre>
            </div>

            {/* Error Format */}
            <div>
              <h2 className="text-2xl font-semibold text-foreground">
                Error Format
              </h2>
              <p className="mt-3 text-muted-foreground leading-relaxed">
                When an error occurs the API returns a JSON object with an{" "}
                <code className="rounded bg-secondary px-1.5 py-0.5 text-sm">
                  error
                </code>{" "}
                key containing a machine-readable{" "}
                <code className="rounded bg-secondary px-1.5 py-0.5 text-sm">
                  code
                </code>{" "}
                and a human-readable{" "}
                <code className="rounded bg-secondary px-1.5 py-0.5 text-sm">
                  message
                </code>
                .
              </p>
              <pre className="mt-3 rounded bg-secondary p-4 text-sm overflow-x-auto">
                <code>{`{
  "error": {
    "code": "invalid_api_key",
    "message": "The API key provided is invalid or has been revoked."
  }
}`}</code>
              </pre>
              <p className="mt-3 text-muted-foreground leading-relaxed">
                Common error codes include{" "}
                <code className="rounded bg-secondary px-1.5 py-0.5 text-sm">
                  invalid_api_key
                </code>
                ,{" "}
                <code className="rounded bg-secondary px-1.5 py-0.5 text-sm">
                  not_found
                </code>
                ,{" "}
                <code className="rounded bg-secondary px-1.5 py-0.5 text-sm">
                  validation_error
                </code>
                ,{" "}
                <code className="rounded bg-secondary px-1.5 py-0.5 text-sm">
                  rate_limit_exceeded
                </code>
                , and{" "}
                <code className="rounded bg-secondary px-1.5 py-0.5 text-sm">
                  internal_error
                </code>
                .
              </p>
            </div>

            {/* ── Endpoints ── */}
            <div>
              <h2 className="text-2xl font-semibold text-foreground">
                Endpoints
              </h2>
            </div>

            {/* GET /agents */}
            <div>
              <h3 className="text-lg font-medium text-foreground">
                GET /agents
              </h3>
              <p className="mt-2 text-muted-foreground leading-relaxed">
                Returns a paginated list of all voice agents in your
                organization.
              </p>
              <pre className="mt-3 rounded bg-secondary p-4 text-sm overflow-x-auto">
                <code>{`curl https://calltone.ai/api/v1/agents \\
  -H "Authorization: Bearer vxf_your_api_key"`}</code>
              </pre>
              <p className="mt-2 text-sm text-muted-foreground">Response:</p>
              <pre className="mt-1 rounded bg-secondary p-4 text-sm overflow-x-auto">
                <code>{`{
  "data": [
    {
      "id": "agt_abc123",
      "name": "Sales Outreach",
      "voice": "alloy",
      "model": "gpt-4o",
      "status": "active",
      "createdAt": "2026-01-15T10:30:00Z"
    }
  ],
  "pagination": {
    "page": 1,
    "pageSize": 20,
    "totalCount": 4
  }
}`}</code>
              </pre>
            </div>

            {/* POST /agents */}
            <div>
              <h3 className="text-lg font-medium text-foreground">
                POST /agents
              </h3>
              <p className="mt-2 text-muted-foreground leading-relaxed">
                Creates a new voice agent. Returns the created agent object.
              </p>
              <pre className="mt-3 rounded bg-secondary p-4 text-sm overflow-x-auto">
                <code>{`curl -X POST https://calltone.ai/api/v1/agents \\
  -H "Authorization: Bearer vxf_your_api_key" \\
  -H "Content-Type: application/json" \\
  -d '{
    "name": "Appointment Setter",
    "systemPrompt": "You are a friendly appointment scheduler for Acme Dental...",
    "voice": "shimmer",
    "model": "gpt-4o",
    "firstMessage": "Hi! This is Acme Dental calling to help you schedule your next visit."
  }'`}</code>
              </pre>
              <p className="mt-2 text-sm text-muted-foreground">Response (201 Created):</p>
              <pre className="mt-1 rounded bg-secondary p-4 text-sm overflow-x-auto">
                <code>{`{
  "data": {
    "id": "agt_def456",
    "name": "Appointment Setter",
    "voice": "shimmer",
    "model": "gpt-4o",
    "status": "active",
    "createdAt": "2026-02-10T14:22:00Z"
  }
}`}</code>
              </pre>
            </div>

            {/* GET /agents/:id */}
            <div>
              <h3 className="text-lg font-medium text-foreground">
                GET /agents/:id
              </h3>
              <p className="mt-2 text-muted-foreground leading-relaxed">
                Returns the full details of a single agent including its system
                prompt, voice configuration, and capabilities.
              </p>
              <pre className="mt-3 rounded bg-secondary p-4 text-sm overflow-x-auto">
                <code>{`curl https://calltone.ai/api/v1/agents/agt_abc123 \\
  -H "Authorization: Bearer vxf_your_api_key"`}</code>
              </pre>
              <p className="mt-2 text-sm text-muted-foreground">Response:</p>
              <pre className="mt-1 rounded bg-secondary p-4 text-sm overflow-x-auto">
                <code>{`{
  "data": {
    "id": "agt_abc123",
    "name": "Sales Outreach",
    "systemPrompt": "You are a sales representative for...",
    "voice": "alloy",
    "voiceProvider": "vapi",
    "model": "gpt-4o",
    "firstMessage": "Hi, this is Sarah from Acme Solutions...",
    "appointmentScheduling": true,
    "receptionistMode": false,
    "status": "active",
    "createdAt": "2026-01-15T10:30:00Z",
    "updatedAt": "2026-02-01T09:15:00Z"
  }
}`}</code>
              </pre>
            </div>

            {/* GET /calls */}
            <div>
              <h3 className="text-lg font-medium text-foreground">
                GET /calls
              </h3>
              <p className="mt-2 text-muted-foreground leading-relaxed">
                Returns a paginated list of calls. Filter by agent, status,
                direction, or date range using query parameters.
              </p>
              <pre className="mt-3 rounded bg-secondary p-4 text-sm overflow-x-auto">
                <code>{`curl "https://calltone.ai/api/v1/calls?agentId=agt_abc123&status=completed&limit=10" \\
  -H "Authorization: Bearer vxf_your_api_key"`}</code>
              </pre>
              <p className="mt-2 text-sm text-muted-foreground">Response:</p>
              <pre className="mt-1 rounded bg-secondary p-4 text-sm overflow-x-auto">
                <code>{`{
  "data": [
    {
      "id": "call_xyz789",
      "agentId": "agt_abc123",
      "direction": "outbound",
      "status": "completed",
      "from": "+14155551234",
      "to": "+16505559876",
      "duration": 142,
      "sentiment": "positive",
      "summary": "Prospect agreed to a follow-up demo on Thursday.",
      "createdAt": "2026-02-10T16:45:00Z"
    }
  ],
  "pagination": {
    "page": 1,
    "pageSize": 10,
    "totalCount": 238
  }
}`}</code>
              </pre>
            </div>

            {/* POST /calls */}
            <div>
              <h3 className="text-lg font-medium text-foreground">
                POST /calls
              </h3>
              <p className="mt-2 text-muted-foreground leading-relaxed">
                Initiates an outbound call. The call will be placed immediately
                using the specified agent and phone number.
              </p>
              <pre className="mt-3 rounded bg-secondary p-4 text-sm overflow-x-auto">
                <code>{`curl -X POST https://calltone.ai/api/v1/calls \\
  -H "Authorization: Bearer vxf_your_api_key" \\
  -H "Content-Type: application/json" \\
  -d '{
    "agentId": "agt_abc123",
    "phoneNumberId": "phn_001",
    "to": "+16505559876"
  }'`}</code>
              </pre>
              <p className="mt-2 text-sm text-muted-foreground">Response (201 Created):</p>
              <pre className="mt-1 rounded bg-secondary p-4 text-sm overflow-x-auto">
                <code>{`{
  "data": {
    "id": "call_new001",
    "agentId": "agt_abc123",
    "direction": "outbound",
    "status": "queued",
    "to": "+16505559876",
    "createdAt": "2026-02-11T09:00:00Z"
  }
}`}</code>
              </pre>
            </div>

            {/* GET /campaigns */}
            <div>
              <h3 className="text-lg font-medium text-foreground">
                GET /campaigns
              </h3>
              <p className="mt-2 text-muted-foreground leading-relaxed">
                Returns all campaigns in your organization. Includes status,
                progress, and schedule information.
              </p>
              <pre className="mt-3 rounded bg-secondary p-4 text-sm overflow-x-auto">
                <code>{`curl https://calltone.ai/api/v1/campaigns \\
  -H "Authorization: Bearer vxf_your_api_key"`}</code>
              </pre>
              <p className="mt-2 text-sm text-muted-foreground">Response:</p>
              <pre className="mt-1 rounded bg-secondary p-4 text-sm overflow-x-auto">
                <code>{`{
  "data": [
    {
      "id": "cmp_winter01",
      "name": "Winter Promo Outreach",
      "agentId": "agt_abc123",
      "status": "running",
      "totalContacts": 500,
      "contactsReached": 312,
      "startDate": "2026-02-01T09:00:00Z",
      "endDate": "2026-02-28T17:00:00Z"
    }
  ],
  "pagination": {
    "page": 1,
    "pageSize": 20,
    "totalCount": 3
  }
}`}</code>
              </pre>
            </div>

            {/* POST /campaigns */}
            <div>
              <h3 className="text-lg font-medium text-foreground">
                POST /campaigns
              </h3>
              <p className="mt-2 text-muted-foreground leading-relaxed">
                Creates a new outbound calling campaign. You must specify the
                agent, phone number, contact list, and calling schedule.
              </p>
              <pre className="mt-3 rounded bg-secondary p-4 text-sm overflow-x-auto">
                <code>{`curl -X POST https://calltone.ai/api/v1/campaigns \\
  -H "Authorization: Bearer vxf_your_api_key" \\
  -H "Content-Type: application/json" \\
  -d '{
    "name": "Spring Sale Blitz",
    "agentId": "agt_abc123",
    "phoneNumberId": "phn_001",
    "contactListId": "lst_spring2026",
    "schedule": {
      "startDate": "2026-03-01",
      "endDate": "2026-03-15",
      "callingHoursStart": "09:00",
      "callingHoursEnd": "17:00",
      "timezone": "America/New_York",
      "maxCallsPerDay": 200
    }
  }'`}</code>
              </pre>
              <p className="mt-2 text-sm text-muted-foreground">Response (201 Created):</p>
              <pre className="mt-1 rounded bg-secondary p-4 text-sm overflow-x-auto">
                <code>{`{
  "data": {
    "id": "cmp_spring01",
    "name": "Spring Sale Blitz",
    "status": "scheduled",
    "totalContacts": 1200,
    "createdAt": "2026-02-11T11:00:00Z"
  }
}`}</code>
              </pre>
            </div>

            {/* GET /contacts */}
            <div>
              <h3 className="text-lg font-medium text-foreground">
                GET /contacts
              </h3>
              <p className="mt-2 text-muted-foreground leading-relaxed">
                Returns a paginated list of contacts. Supports filtering by
                name, phone, email, and tags.
              </p>
              <pre className="mt-3 rounded bg-secondary p-4 text-sm overflow-x-auto">
                <code>{`curl "https://calltone.ai/api/v1/contacts?tag=lead&limit=5" \\
  -H "Authorization: Bearer vxf_your_api_key"`}</code>
              </pre>
              <p className="mt-2 text-sm text-muted-foreground">Response:</p>
              <pre className="mt-1 rounded bg-secondary p-4 text-sm overflow-x-auto">
                <code>{`{
  "data": [
    {
      "id": "cnt_001",
      "firstName": "Jane",
      "lastName": "Doe",
      "phone": "+16505551234",
      "email": "jane@example.com",
      "tags": ["lead", "demo-requested"],
      "createdAt": "2026-01-20T08:00:00Z"
    }
  ],
  "pagination": {
    "page": 1,
    "pageSize": 5,
    "totalCount": 842
  }
}`}</code>
              </pre>
            </div>

            {/* POST /contacts */}
            <div>
              <h3 className="text-lg font-medium text-foreground">
                POST /contacts
              </h3>
              <p className="mt-2 text-muted-foreground leading-relaxed">
                Creates a new contact record. Phone number is required and must
                be in E.164 format.
              </p>
              <pre className="mt-3 rounded bg-secondary p-4 text-sm overflow-x-auto">
                <code>{`curl -X POST https://calltone.ai/api/v1/contacts \\
  -H "Authorization: Bearer vxf_your_api_key" \\
  -H "Content-Type: application/json" \\
  -d '{
    "firstName": "John",
    "lastName": "Smith",
    "phone": "+14085559999",
    "email": "john.smith@example.com",
    "company": "Smith & Co",
    "tags": ["prospect"]
  }'`}</code>
              </pre>
              <p className="mt-2 text-sm text-muted-foreground">Response (201 Created):</p>
              <pre className="mt-1 rounded bg-secondary p-4 text-sm overflow-x-auto">
                <code>{`{
  "data": {
    "id": "cnt_new002",
    "firstName": "John",
    "lastName": "Smith",
    "phone": "+14085559999",
    "email": "john.smith@example.com",
    "company": "Smith & Co",
    "tags": ["prospect"],
    "createdAt": "2026-02-11T12:30:00Z"
  }
}`}</code>
              </pre>
            </div>

            {/* Pagination */}
            <div>
              <h2 className="text-2xl font-semibold text-foreground">
                Pagination
              </h2>
              <p className="mt-3 text-muted-foreground leading-relaxed">
                All list endpoints return paginated results. Use the{" "}
                <code className="rounded bg-secondary px-1.5 py-0.5 text-sm">
                  page
                </code>{" "}
                and{" "}
                <code className="rounded bg-secondary px-1.5 py-0.5 text-sm">
                  limit
                </code>{" "}
                query parameters to navigate through results. The maximum page
                size is 100. The response includes a{" "}
                <code className="rounded bg-secondary px-1.5 py-0.5 text-sm">
                  pagination
                </code>{" "}
                object with{" "}
                <code className="rounded bg-secondary px-1.5 py-0.5 text-sm">
                  page
                </code>
                ,{" "}
                <code className="rounded bg-secondary px-1.5 py-0.5 text-sm">
                  pageSize
                </code>
                , and{" "}
                <code className="rounded bg-secondary px-1.5 py-0.5 text-sm">
                  totalCount
                </code>
                .
              </p>
            </div>

            {/* Need Help */}
            <div>
              <h2 className="text-2xl font-semibold text-foreground">
                Need Help?
              </h2>
              <p className="mt-3 text-muted-foreground leading-relaxed">
                If you run into issues with the API, reach out to us at{" "}
                <strong className="text-foreground">
                  developers@calltone.ai
                </strong>{" "}
                or check the{" "}
                <Link
                  href="/docs/tutorials"
                  className="text-primary hover:underline"
                >
                  Tutorials
                </Link>{" "}
                page for step-by-step integration guides.
              </p>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
