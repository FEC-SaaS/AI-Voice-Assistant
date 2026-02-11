/**
 * Twilio Trust Hub API client for CNAM (Caller Name) registration.
 *
 * Flow:
 * 1. Create a Customer Profile (business identity)
 * 2. Create an End User (business entity details)
 * 3. Assign End User to Customer Profile
 * 4. Submit Customer Profile for evaluation
 * 5. Once approved, create a Trust Product for CNAM
 * 6. Assign phone numbers to the Trust Product
 * 7. Submit Trust Product for evaluation
 *
 * Twilio Trust Hub base URL: https://trusthub.twilio.com/v1
 */

const TRUST_HUB_URL = "https://trusthub.twilio.com/v1";

// US CNAM policy SID — Twilio's standard policy for outbound CNAM
// This is the well-known policy SID for "Voice - CNAM - US"
const CNAM_POLICY_SID = "RN806dd6cd175f314e1f96a9727ee271f4";

interface TrustHubRequestOptions {
  method: "GET" | "POST" | "DELETE";
  path: string;
  body?: Record<string, string>;
  accountSid: string;
  authToken: string;
}

async function trustHubRequest<T>(options: TrustHubRequestOptions): Promise<T> {
  const { method, path, body, accountSid, authToken } = options;

  const url = `${TRUST_HUB_URL}${path}`;
  const auth = Buffer.from(`${accountSid}:${authToken}`).toString("base64");

  console.log(`[TrustHub] ${method} ${path}`);

  const response = await fetch(url, {
    method,
    headers: {
      Authorization: `Basic ${auth}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: body ? new URLSearchParams(body).toString() : undefined,
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({
      message: response.statusText,
    }));
    const code = error.code ? ` (${error.code})` : "";
    console.error(
      `[TrustHub] Error ${response.status}${code}: ${error.message || JSON.stringify(error)}`
    );
    throw new Error(
      `Trust Hub API error: ${response.status}${code} - ${error.message || JSON.stringify(error)}`
    );
  }

  return response.json();
}

// ────────────────────────────────────────
// Customer Profiles (Business Identity)
// ────────────────────────────────────────

export interface CustomerProfile {
  sid: string;
  account_sid: string;
  friendly_name: string;
  status: "draft" | "pending-review" | "in-review" | "twilio-approved" | "twilio-rejected";
  policy_sid: string;
  date_created: string;
  date_updated: string;
  url: string;
}

export async function createCustomerProfile(
  friendlyName: string,
  email: string,
  accountSid: string,
  authToken: string
): Promise<CustomerProfile> {
  return trustHubRequest<CustomerProfile>({
    method: "POST",
    path: "/CustomerProfiles",
    body: {
      FriendlyName: friendlyName,
      Email: email,
      PolicySid: CNAM_POLICY_SID,
    },
    accountSid,
    authToken,
  });
}

export async function getCustomerProfile(
  profileSid: string,
  accountSid: string,
  authToken: string
): Promise<CustomerProfile> {
  return trustHubRequest<CustomerProfile>({
    method: "GET",
    path: `/CustomerProfiles/${profileSid}`,
    accountSid,
    authToken,
  });
}

// ────────────────────────────────────────
// End Users (Business Entity)
// ────────────────────────────────────────

export interface EndUser {
  sid: string;
  friendly_name: string;
  type: string;
  attributes: Record<string, string>;
  date_created: string;
  date_updated: string;
}

export async function createEndUser(
  businessInfo: {
    friendlyName: string;
    businessName: string;
    businessType: string;
    ein?: string;
    address: string;
    city: string;
    state: string;
    zip: string;
    country: string;
  },
  accountSid: string,
  authToken: string
): Promise<EndUser> {
  const attributes: Record<string, string> = {
    business_name: businessInfo.businessName,
    business_type: businessInfo.businessType,
    address_street: businessInfo.address,
    address_city: businessInfo.city,
    address_state: businessInfo.state,
    address_postal_code: businessInfo.zip,
    address_country_code: businessInfo.country,
  };
  if (businessInfo.ein) {
    attributes.business_registration_number = businessInfo.ein;
  }

  return trustHubRequest<EndUser>({
    method: "POST",
    path: "/EndUsers",
    body: {
      FriendlyName: businessInfo.friendlyName,
      Type: "customer_profile_business_information",
      "Attributes": JSON.stringify(attributes),
    },
    accountSid,
    authToken,
  });
}

// ────────────────────────────────────────
// Entity Assignments (link End User to Customer Profile)
// ────────────────────────────────────────

export interface EntityAssignment {
  sid: string;
  customer_profile_sid: string;
  object_sid: string;
  date_created: string;
}

export async function assignEntityToProfile(
  profileSid: string,
  objectSid: string,
  accountSid: string,
  authToken: string
): Promise<EntityAssignment> {
  return trustHubRequest<EntityAssignment>({
    method: "POST",
    path: `/CustomerProfiles/${profileSid}/EntityAssignments`,
    body: {
      ObjectSid: objectSid,
    },
    accountSid,
    authToken,
  });
}

// ────────────────────────────────────────
// Evaluations (submit for review)
// ────────────────────────────────────────

export interface Evaluation {
  sid: string;
  status: "compliant" | "noncompliant";
  results: Array<{
    friendly_name: string;
    object_type: string;
    passed: boolean;
    failure_reason?: string;
  }>;
  date_created: string;
}

export async function submitProfileForEvaluation(
  profileSid: string,
  accountSid: string,
  authToken: string
): Promise<Evaluation> {
  return trustHubRequest<Evaluation>({
    method: "POST",
    path: `/CustomerProfiles/${profileSid}/Evaluations`,
    body: {
      PolicySid: CNAM_POLICY_SID,
    },
    accountSid,
    authToken,
  });
}

// ────────────────────────────────────────
// Trust Products (CNAM use case)
// ────────────────────────────────────────

export interface TrustProduct {
  sid: string;
  account_sid: string;
  friendly_name: string;
  status: "draft" | "pending-review" | "in-review" | "twilio-approved" | "twilio-rejected";
  policy_sid: string;
  date_created: string;
  date_updated: string;
}

export async function createTrustProduct(
  friendlyName: string,
  email: string,
  accountSid: string,
  authToken: string
): Promise<TrustProduct> {
  return trustHubRequest<TrustProduct>({
    method: "POST",
    path: "/TrustProducts",
    body: {
      FriendlyName: friendlyName,
      Email: email,
      PolicySid: CNAM_POLICY_SID,
    },
    accountSid,
    authToken,
  });
}

export async function getTrustProduct(
  trustProductSid: string,
  accountSid: string,
  authToken: string
): Promise<TrustProduct> {
  return trustHubRequest<TrustProduct>({
    method: "GET",
    path: `/TrustProducts/${trustProductSid}`,
    accountSid,
    authToken,
  });
}

// ────────────────────────────────────────
// Trust Product Entity Assignments (link profile + numbers)
// ────────────────────────────────────────

export interface TrustProductAssignment {
  sid: string;
  trust_product_sid: string;
  object_sid: string;
  date_created: string;
}

export async function assignToTrustProduct(
  trustProductSid: string,
  objectSid: string,
  accountSid: string,
  authToken: string
): Promise<TrustProductAssignment> {
  return trustHubRequest<TrustProductAssignment>({
    method: "POST",
    path: `/TrustProducts/${trustProductSid}/EntityAssignments`,
    body: {
      ObjectSid: objectSid,
    },
    accountSid,
    authToken,
  });
}

export async function submitTrustProductForEvaluation(
  trustProductSid: string,
  accountSid: string,
  authToken: string
): Promise<Evaluation> {
  return trustHubRequest<Evaluation>({
    method: "POST",
    path: `/TrustProducts/${trustProductSid}/Evaluations`,
    body: {
      PolicySid: CNAM_POLICY_SID,
    },
    accountSid,
    authToken,
  });
}

// ────────────────────────────────────────
// Channel Endpoint Assignments (assign phone numbers)
// ────────────────────────────────────────

export interface ChannelEndpointAssignment {
  sid: string;
  trust_product_sid: string;
  channel_endpoint_sid: string;
  channel_endpoint_type: string;
  date_created: string;
}

export async function assignPhoneToTrustProduct(
  trustProductSid: string,
  phoneNumberSid: string,
  accountSid: string,
  authToken: string
): Promise<ChannelEndpointAssignment> {
  return trustHubRequest<ChannelEndpointAssignment>({
    method: "POST",
    path: `/TrustProducts/${trustProductSid}/ChannelEndpointAssignments`,
    body: {
      ChannelEndpointSid: phoneNumberSid,
      ChannelEndpointType: "phone-number",
    },
    accountSid,
    authToken,
  });
}
