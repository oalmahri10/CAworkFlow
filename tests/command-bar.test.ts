import { describe, expect, it } from "vitest";
import { parseCommand } from "@/lib/command-bar";

describe("command-bar — rule-based local parsing", () => {
  it("matches 'Show active ATs'", () => {
    const result = parseCommand("Show active ATs");
    expect(result.matched).toBe(true);
    if (result.matched) {
      expect(result.where).toMatchObject({ requestType: "AT" });
    }
  });

  it("matches 'Show applications pending with Risk'", () => {
    const result = parseCommand("Show applications pending with Risk");
    expect(result.matched).toBe(true);
    if (result.matched) {
      expect(result.where).toMatchObject({ currentDepartment: "CREDIT_REVIEW" });
    }
  });

  it("matches 'Find <reference>'", () => {
    const result = parseCommand("Find CRO80-CA-2026-0001");
    expect(result.matched).toBe(true);
  });

  it("matches repeat-query command", () => {
    const result = parseCommand("Show requests returned more than once");
    expect(result.matched).toBe(true);
  });

  it("returns an explicit unsupported message for unknown input, never a guess", () => {
    const result = parseCommand("What is the weather today");
    expect(result.matched).toBe(false);
    if (!result.matched) {
      expect(result.message).toContain("Unsupported command");
    }
  });

  it("rejects an unknown department name in a pending-with command", () => {
    const result = parseCommand("Show applications pending with Marketing");
    expect(result.matched).toBe(false);
  });
});
