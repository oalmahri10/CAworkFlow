import { describe, expect, it } from "vitest";
import {
  computeApprovalRoutingExposure,
  formatCurrency,
  formatMinorToMajor,
  MoneyError,
  parseMajorToMinor,
} from "@/lib/money";

describe("money — currency-precision-aware minor unit arithmetic", () => {
  it("parses BHD (3 decimal places) correctly", () => {
    expect(parseMajorToMinor("9500000.5", "BHD")).toBe(9500000500n);
    expect(parseMajorToMinor("100", "BHD")).toBe(100000n);
  });

  it("parses USD (2 decimal places) correctly", () => {
    expect(parseMajorToMinor("1234.5", "USD")).toBe(123450n);
  });

  it("rejects more fractional digits than the currency supports", () => {
    expect(() => parseMajorToMinor("1.2345", "USD")).toThrow(MoneyError);
  });

  it("rejects negative or non-numeric input", () => {
    expect(() => parseMajorToMinor("-5", "USD")).toThrow(MoneyError);
    expect(() => parseMajorToMinor("abc", "USD")).toThrow(MoneyError);
    expect(() => parseMajorToMinor("1e10", "USD")).toThrow(MoneyError);
  });

  it("round-trips minor -> major formatting", () => {
    expect(formatMinorToMajor(9500000500n, "BHD")).toBe("9500000.500");
    expect(formatMinorToMajor(123450n, "USD")).toBe("1234.50");
  });

  it("formats currency with thousands separators", () => {
    expect(formatCurrency(9500000500n, "BHD")).toBe("BHD 9,500,000.500");
  });

  it("rejects an unsupported currency rather than defaulting silently", () => {
    expect(() => parseMajorToMinor("100", "XYZ")).toThrow(MoneyError);
  });

  it("computes Approval-Routing Exposure = Group + Related-Party", () => {
    const group = parseMajorToMinor("8400000", "BHD");
    const related = parseMajorToMinor("1100000", "BHD");
    const total = computeApprovalRoutingExposure(group, related, "BHD", "BHD");
    expect(formatCurrency(total, "BHD")).toBe("BHD 9,500,000.000");
  });

  it("refuses to combine mismatched currencies", () => {
    const group = parseMajorToMinor("100", "BHD");
    const related = parseMajorToMinor("100", "USD");
    expect(() => computeApprovalRoutingExposure(group, related, "BHD", "USD")).toThrow(MoneyError);
  });

  it("refuses negative exposure amounts", () => {
    expect(() => computeApprovalRoutingExposure(-1n, 0n, "BHD", "BHD")).toThrow(MoneyError);
  });
});
