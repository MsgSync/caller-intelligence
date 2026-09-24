export type ReputationInput = {
  reportCount: number;
  uniqueReporters: number;
  recentReports: number;
  trustedReports: number;
  verifiedBusiness: boolean;
};

export function calculateSpamScore(input: ReputationInput): number {
  const raw =
    input.reportCount * 0.25 +
    input.uniqueReporters * 0.35 +
    input.recentReports * 0.2 +
    input.trustedReports * 0.2 -
    (input.verifiedBusiness ? 25 : 0);

  return Math.max(0, Math.min(100, Math.round(raw)));
}
