import { describe, expect, it } from "vitest";
import { formatActivityAmount, isRateLimitError } from "./safeActivity";

describe("formatActivityAmount", () => {
  it("returns an em dash when amount is missing", () => {
    expect(formatActivityAmount(undefined)).toBe("—");
  });

  it("formats wei as BDAG with six decimals", () => {
    expect(formatActivityAmount(1_500_000_000_000_000_000n)).toBe(
      "1.500000 BDAG"
    );
  });
});

describe("isRateLimitError", () => {
  it("detects rate-limit phrasing", () => {
    expect(isRateLimitError(new Error("rate limit exceeded"))).toBe(true);
    expect(isRateLimitError("request exceeds defined limit")).toBe(true);
    expect(isRateLimitError({ message: "HTTP 429" })).toBe(false);
    expect(isRateLimitError(new Error("HTTP 429 Too Many Requests"))).toBe(
      true
    );
  });

  it("ignores unrelated errors", () => {
    expect(isRateLimitError(new Error("execution reverted"))).toBe(false);
    expect(isRateLimitError(null)).toBe(false);
  });
});
