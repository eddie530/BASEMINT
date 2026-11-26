import { describe, expect, it } from "vitest";
import { createIndependentMocks } from "./independent-mocks";
describe("independent mocks", () => {
  it("simulates exactly 4.99 USDC and deduplicates", () => {
    const m = createIndependentMocks();
    expect(m.checkout("test", 4_990_000n)).toBe(m.checkout("test", 4_990_000n));
    expect(m.orders()).toHaveLength(1);
    expect(m.orders()[0].mode).toBe("mock");
  });
  it("rejects invalid amounts and signing or transfers", () => {
    const m = createIndependentMocks();
    expect(() => m.checkout("test", 1n)).toThrow();
    expect(() => m.sign()).toThrow();
    expect(() => m.send()).toThrow();
  });
  it("isolates fixture instances", () => {
    createIndependentMocks().checkout("test", 4_990_000n);
    expect(createIndependentMocks().orders()).toHaveLength(0);
  });
});
