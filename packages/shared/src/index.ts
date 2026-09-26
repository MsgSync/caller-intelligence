export type RiskLevel = "low" | "medium" | "high";

export type NumberProfile = {
  phone: string;
  displayName?: string;
  verified: boolean;
  spamScore: number;
  confidence: number;
  risk: RiskLevel;
  reportCount: number;
  categories: string[];
};
