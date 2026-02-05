import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

export interface DomainDnsRecord {
  type: string;
  name: string;
  value: string;
  priority?: number;
  ttl?: string;
  status: "not_started" | "pending" | "verified" | "failed";
}

export interface DomainInfo {
  id: string;
  name: string;
  status: "not_started" | "pending" | "verified" | "failed";
  createdAt: string;
  region: string;
  records: DomainDnsRecord[];
}

export interface AddDomainResult {
  success: boolean;
  domain?: DomainInfo;
  error?: string;
}

export interface VerifyDomainResult {
  success: boolean;
  status?: string;
  error?: string;
}

/**
 * Add a new domain to Resend for email sending
 * Recommend using a subdomain like mail.clientdomain.com
 */
export async function addDomain(domain: string): Promise<AddDomainResult> {
  try {
    if (!process.env.RESEND_API_KEY) {
      return { success: false, error: "Resend API key not configured" };
    }

    console.log(`[Resend] Adding domain: ${domain}`);

    const response = await resend.domains.create({
      name: domain,
    });

    if (response.error) {
      console.error("[Resend] Add domain error:", response.error);
      return {
        success: false,
        error: response.error.message || "Failed to add domain"
      };
    }

    if (!response.data) {
      return { success: false, error: "No data returned from Resend" };
    }

    // Map the response to our interface
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const data = response.data as any;
    const domainInfo: DomainInfo = {
      id: data.id,
      name: data.name,
      status: data.status as DomainInfo["status"],
      createdAt: data.created_at,
      region: data.region,
      records: (data.records || []).map((r: { type?: string; record?: string; name: string; value: string; priority?: number; ttl?: string; status: string }) => ({
        type: r.type || r.record || "TXT",
        name: r.name,
        value: r.value,
        priority: r.priority,
        ttl: r.ttl,
        status: r.status as DomainDnsRecord["status"],
      })),
    };

    console.log(`[Resend] Domain added successfully:`, domainInfo.id);
    return { success: true, domain: domainInfo };
  } catch (error) {
    console.error("[Resend] Add domain exception:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error"
    };
  }
}

/**
 * Get domain details including DNS records
 */
export async function getDomain(domainId: string): Promise<AddDomainResult> {
  try {
    if (!process.env.RESEND_API_KEY) {
      return { success: false, error: "Resend API key not configured" };
    }

    const response = await resend.domains.get(domainId);

    if (response.error) {
      console.error("[Resend] Get domain error:", response.error);
      return {
        success: false,
        error: response.error.message || "Failed to get domain"
      };
    }

    if (!response.data) {
      return { success: false, error: "Domain not found" };
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const data = response.data as any;
    const domainInfo: DomainInfo = {
      id: data.id,
      name: data.name,
      status: data.status as DomainInfo["status"],
      createdAt: data.created_at,
      region: data.region,
      records: (data.records || []).map((r: { type?: string; record?: string; name: string; value: string; priority?: number; ttl?: string; status: string }) => ({
        type: r.type || r.record || "TXT",
        name: r.name,
        value: r.value,
        priority: r.priority,
        ttl: r.ttl,
        status: r.status as DomainDnsRecord["status"],
      })),
    };

    return { success: true, domain: domainInfo };
  } catch (error) {
    console.error("[Resend] Get domain exception:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error"
    };
  }
}

/**
 * Verify domain DNS records
 */
export async function verifyDomain(domainId: string): Promise<VerifyDomainResult> {
  try {
    if (!process.env.RESEND_API_KEY) {
      return { success: false, error: "Resend API key not configured" };
    }

    console.log(`[Resend] Verifying domain: ${domainId}`);

    const response = await resend.domains.verify(domainId);

    if (response.error) {
      console.error("[Resend] Verify domain error:", response.error);
      return {
        success: false,
        error: response.error.message || "Verification failed"
      };
    }

    // Get updated domain status
    const domainResult = await getDomain(domainId);

    return {
      success: true,
      status: domainResult.domain?.status || "pending"
    };
  } catch (error) {
    console.error("[Resend] Verify domain exception:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error"
    };
  }
}

/**
 * Remove a domain from Resend
 */
export async function removeDomain(domainId: string): Promise<{ success: boolean; error?: string }> {
  try {
    if (!process.env.RESEND_API_KEY) {
      return { success: false, error: "Resend API key not configured" };
    }

    console.log(`[Resend] Removing domain: ${domainId}`);

    const response = await resend.domains.remove(domainId);

    if (response.error) {
      console.error("[Resend] Remove domain error:", response.error);
      return {
        success: false,
        error: response.error.message || "Failed to remove domain"
      };
    }

    console.log(`[Resend] Domain removed successfully`);
    return { success: true };
  } catch (error) {
    console.error("[Resend] Remove domain exception:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error"
    };
  }
}

/**
 * List all domains for the account
 */
export async function listDomains(): Promise<{ success: boolean; domains?: DomainInfo[]; error?: string }> {
  try {
    if (!process.env.RESEND_API_KEY) {
      return { success: false, error: "Resend API key not configured" };
    }

    const response = await resend.domains.list();

    if (response.error) {
      console.error("[Resend] List domains error:", response.error);
      return {
        success: false,
        error: response.error.message || "Failed to list domains"
      };
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const dataList = (response.data as any)?.data || response.data || [];
    const domains: DomainInfo[] = (Array.isArray(dataList) ? dataList : []).map((d: { id: string; name: string; status: string; created_at: string; region: string }) => ({
      id: d.id,
      name: d.name,
      status: d.status as DomainInfo["status"],
      createdAt: d.created_at,
      region: d.region,
      records: [],
    }));

    return { success: true, domains };
  } catch (error) {
    console.error("[Resend] List domains exception:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error"
    };
  }
}
