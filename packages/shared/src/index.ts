export type RiskLevel = "low" | "medium" | "high";
export type ReportCategory = "spam" | "scam" | "telemarketing" | "robocall" | "other";

export type NumberProfile = {
  phone: string;
  displayName?: string;
  verified: boolean;
  spamScore: number;
  confidence: number;
  risk: RiskLevel;
  reportCount: number;
  categories: ReportCategory[];
};
