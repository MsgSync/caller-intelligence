import { describe, it, expect } from "vitest";
import { calculateSpamScore } from "../src/index";

describe("calculateSpamScore", () => {
  it("returns 0 for no reports", () => {
    expect(calculateSpamScore({ reportCount: 0, uniqueReporters: 0, recentReports: 0, trustedReports: 0, verifiedBusiness: false })).toBe(0);
  });

  it("returns high score for many reports", () => {
    const score = calculateSpamScore({ reportCount: 10, uniqueReporters: 8, recentReports: 4, trustedReports: 3, verifiedBusiness: false });
    expect(score).toBeGreaterThan(0);
    expect(score).toBeLessThanOrEqual(100);
  });

  it("reduces score for verified business", () => {
    const unverified = calculateSpamScore({ reportCount: 5, uniqueReporters: 3, recentReports: 2, trustedReports: 2, verifiedBusiness: false });
    const verified = calculateSpamScore({ reportCount: 5, uniqueReporters: 3, recentReports: 2, trustedReports: 2, verifiedBusiness: true });
    expect(verified).toBeLessThan(unverified);
  });

  it("caps at 100", () => {
    const score = calculateSpamScore({ reportCount: 100, uniqueReporters: 50, recentReports: 30, trustedReports: 20, verifiedBusiness: false });
    expect(score).toBeLessThanOrEqual(100);
  });

  it("minimum is 0", () => {
    const score = calculateSpamScore({ reportCount: 0, uniqueReporters: 0, recentReports: 0, trustedReports: 0, verifiedBusiness: true });
    expect(score).toBeGreaterThanOrEqual(0);
  });
});
