export type SourceBreakdown = {
  name: string;
  contactCount: number;
  badRate: number;
  annualSpend?: number;
  creditEligible?: number;
};

export type FlaggedContact = {
  email: string;
  risk: "invalid" | "risky";
  reason: string;
  source: string;
};

export type Recommendation = {
  priority: "critical" | "high" | "medium";
  title: string;
  why: string;
  estimatedImpact: number;
};

export type AuditReport = {
  slug: string;
  isSample?: boolean;
  customer: {
    name: string;
    logoText: string;
    logoColor: string;
  };
  preparedFor: string;
  preparedDate: string;
  auditor: string;
  headline: string;
  subheadline: string;
  databaseSize: number;
  metrics: {
    contactRiskRate: number;
    invalidContacts: number;
    phoneRiskRate: number;
    duplicates: number;
    completenessScore: number;
  };
  sources: SourceBreakdown[];
  roi: {
    totalAnnualImpact: number;
    repTimeWasted: number;
    dataVendorWaste: number;
    pipelineAtRisk: number;
    repCount: number;
    avgPipelinePerRep: number;
  };
  flaggedSample: FlaggedContact[];
  recommendations: Recommendation[];
  nextSteps: {
    summary: string;
    calendlyUrl: string;
  };
};

const SAMPLE: AuditReport = {
  slug: "sample",
  isSample: true,
  customer: {
    name: "Northstar Logistics",
    logoText: "NL",
    logoColor: "#0EA5E9",
  },
  preparedFor: "Sarah Chen, VP Revenue Operations",
  preparedDate: "June 2026",
  auditor: "Joey Prindle, ReachAudit",
  headline: "Northstar is leaving $67,900 on the table annually",
  subheadline:
    "31% of your contact database is unreachable. ZoomInfo is the primary contributor. You have a credit-recapture window before your November renewal.",
  databaseSize: 47218,
  metrics: {
    contactRiskRate: 0.311,
    invalidContacts: 14685,
    phoneRiskRate: 0.272,
    duplicates: 2104,
    completenessScore: 67,
  },
  sources: [
    {
      name: "ZoomInfo",
      contactCount: 22340,
      badRate: 0.41,
      annualSpend: 24000,
      creditEligible: 6000,
    },
    {
      name: "Apollo",
      contactCount: 11280,
      badRate: 0.29,
      annualSpend: 14400,
      creditEligible: 2000,
    },
    {
      name: "LinkedIn Sales Navigator",
      contactCount: 7420,
      badRate: 0.18,
      annualSpend: 8400,
    },
    {
      name: "Organic / Inbound",
      contactCount: 6178,
      badRate: 0.06,
    },
  ],
  roi: {
    totalAnnualImpact: 67900,
    repTimeWasted: 52500,
    dataVendorWaste: 15400,
    pipelineAtRisk: 4200000,
    repCount: 14,
    avgPipelinePerRep: 950000,
  },
  flaggedSample: [
    {
      email: "j.morales@ridgeline-freight.com",
      risk: "invalid",
      reason: "Mailbox does not exist",
      source: "ZoomInfo",
    },
    {
      email: "ceo@cargopoint-old.com",
      risk: "risky",
      reason: "Domain parked / inactive",
      source: "Apollo",
    },
    {
      email: "info@bigshipper.com",
      risk: "invalid",
      reason: "Role address. Mass reject risk",
      source: "ZoomInfo",
    },
    {
      email: "rachel.davis@formerwarehouse.io",
      risk: "invalid",
      reason: "Domain MX record missing",
      source: "ZoomInfo",
    },
    {
      email: "purchasing@globalfreight.net",
      risk: "risky",
      reason: "Catch-all domain. Unverifiable",
      source: "Apollo",
    },
    {
      email: "m.thompson@northcorpltd.com",
      risk: "invalid",
      reason: "Mailbox quota exceeded. Likely abandoned",
      source: "ZoomInfo",
    },
    {
      email: "operations@shippingplus.org",
      risk: "risky",
      reason: "Role address. Mass reject risk",
      source: "LinkedIn",
    },
    {
      email: "k.patel@defunctlogistics.com",
      risk: "invalid",
      reason: "Domain no longer resolves",
      source: "ZoomInfo",
    },
  ],
  recommendations: [
    {
      priority: "critical",
      title: "File a ZoomInfo credit claim for 9,160 provably invalid contacts before November renewal",
      why: "41% of your ZoomInfo-sourced records are invalid or unreachable. Documented credit eligibility maxes at ~25% of annual contract value in typical goodwill negotiations. That's ~$6,000 against your $24K spend. Lower than the theoretical face value of the bad records, but defensible without burning the vendor relationship. We provide the documentation; you run the conversation.",
      estimatedImpact: 6000,
    },
    {
      priority: "critical",
      title: "Suppress 14,685 unreachable contacts before your next sequence enrollment",
      why: "Continuing to email these contacts harms your sender reputation across every rep. 31% bounce rates trigger inbox provider penalties. Time-recovery math: 14 reps × $75K fully-loaded cost × 5% productive time conservatively redirected from dead-end outreach = $52,500/yr. Conservative on purpose. The real number is likely higher once you factor in context-switching and morale drag.",
      estimatedImpact: 52500,
    },
    {
      priority: "high",
      title: "Cut Apollo seat count by 30% based on ZoomInfo coverage overlap",
      why: "62% of your Apollo contacts also exist in ZoomInfo with higher accuracy. You're paying twice for the same coverage. Apollo's value is in the orgs ZoomInfo doesn't reach well (mid-market SaaS). Keep a smaller exploration license. Estimated savings: ~$4,300/yr.",
      estimatedImpact: 4300,
    },
    {
      priority: "high",
      title: "Deduplicate 2,104 duplicate records before next quarter's pipeline reporting",
      why: "Duplicates inflate your TAM, distort conversion reporting, and result in the same prospect getting hit by multiple reps. Cleanup is straightforward. We've flagged each duplicate pair.",
      estimatedImpact: 5250,
    },
    {
      priority: "medium",
      title: "Add a 90-day verification cadence to all ZoomInfo and Apollo imports",
      why: "B2B contact decay runs ~22% annually. Without ongoing verification, your reachability rate will return to current levels within 18 months. A quarterly hygiene SLA prevents re-accumulation.",
      estimatedImpact: 8900,
    },
  ],
  nextSteps: {
    summary:
      "We recommend filing the ZoomInfo credit claim within the next 30 days, ahead of your November renewal conversation. We can support the claim conversation directly if helpful, and re-audit post-cleanup to validate the new baseline.",
    calendlyUrl: "https://calendly.com/contactzen-joey/new-meeting",
  },
};

const REPORTS: Record<string, AuditReport> = {
  sample: SAMPLE,
};

export function getAuditReport(slug: string): AuditReport | null {
  return REPORTS[slug] ?? null;
}

export function getAllAuditSlugs(): string[] {
  return Object.keys(REPORTS);
}
