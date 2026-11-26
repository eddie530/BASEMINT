import { describe, expect, it } from "vitest";
import { RESIDENT_PRO, membershipActive, validPreparedProof } from "./resident-pro";
const now = Date.parse("2026-11-26T00:00:00Z");
const membership = {
  status: "active",
  current_period_end: "2026-12-26T00:00:00Z",
  price_id: "resident_pro_simulation_v3",
  environment: "resident_v3_simulation",
};
describe("Resident Pro agreed configuration", () => {
  it("costs exactly 4.99 native USDC units", () => {
    expect(RESIDENT_PRO.amountUsdc).toBe(4.99);
    expect(RESIDENT_PRO.units).toBe(4990000n);
  });
  it("lasts 30 days", () => expect(RESIDENT_PRO.days).toBe(30));
  it("keeps checkout in simulation mode", () => expect(RESIDENT_PRO.mode).toBe("simulation"));
  it("recognizes active simulated membership", () =>
    expect(membershipActive(membership, now)).toBe(true));
  it("expires at the exact end, without automatic renewal", () =>
    expect(membershipActive(membership, Date.parse(membership.current_period_end))).toBe(false));
  it("does not accept arbitrary entitlement status", () =>
    expect(membershipActive({ ...membership, status: "pending" }, now)).toBe(false));
  it("does not grant perpetual access from a missing expiration", () =>
    expect(membershipActive({ ...membership, current_period_end: null }, now)).toBe(false));
  it("preserves actual legacy Pro membership", () =>
    expect(
      membershipActive(
        { ...membership, price_id: "resident_pro_monthly", environment: "usdc" },
        now,
      ),
    ).toBe(true));
  it("does not treat Stripe sandbox purchases as actual Pro", () =>
    expect(
      membershipActive(
        { ...membership, price_id: "resident_pro_monthly", environment: "sandbox" },
        now,
      ),
    ).toBe(false));
});
describe("Prepared USDC proof guards — never activates payments", () => {
  const expected = {
    sender: "0x1111111111111111111111111111111111111111",
    recipient: "0xef1ff71edada68942b6ddfd5187888e84218297b",
    token: "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913",
  };
  const proof = {
    ...expected,
    chainId: 8453,
    amount: 4990000n,
    successful: true,
    confirmations: 12,
  };
  it("accepts exact configured proof", () =>
    expect(validPreparedProof(proof, expected)).toBe(true));
  it("rejects wrong network", () =>
    expect(validPreparedProof({ ...proof, chainId: 84532 }, expected)).toBe(false));
  it("rejects wrong sender", () =>
    expect(validPreparedProof({ ...proof, sender: expected.recipient }, expected)).toBe(false));
  it("rejects wrong receiving wallet", () =>
    expect(validPreparedProof({ ...proof, recipient: expected.sender }, expected)).toBe(false));
  it("rejects wrong token", () =>
    expect(validPreparedProof({ ...proof, token: expected.sender }, expected)).toBe(false));
  it("rejects underpayment", () =>
    expect(validPreparedProof({ ...proof, amount: 4989999n }, expected)).toBe(false));
  it("rejects overpayment for this exact quote", () =>
    expect(validPreparedProof({ ...proof, amount: 4990001n }, expected)).toBe(false));
  it("rejects reverted payments", () =>
    expect(validPreparedProof({ ...proof, successful: false }, expected)).toBe(false));
  it("rejects insufficient confirmations", () =>
    expect(validPreparedProof({ ...proof, confirmations: 11 }, expected)).toBe(false));
});
