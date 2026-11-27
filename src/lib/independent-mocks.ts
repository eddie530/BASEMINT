// Standalone synthetic fixtures only. Never import real wallet or payment SDKs.
export function createIndependentMocks() {
  const orders = new Map<string, { id: string; amountUnits: bigint; status: "simulated"; mode: "mock" }>();
  const wallet = Object.freeze({ id: "mock-wallet", balanceUnits: 100_000_000n, mode: "mock" as const });
  return {
    wallet,
    checkout(id: string, amountUnits: bigint) {
      if (!id.trim() || amountUnits !== 4_990_000n) throw new Error("Invalid mock checkout");
      const existing = orders.get(id);
      if (existing) return existing;
      const order = Object.freeze({ id, amountUnits, status: "simulated" as const, mode: "mock" as const });
      orders.set(id, order);
      return order;
    },
    sign(): never { throw new Error("Signing disabled in independent preview"); },
    send(): never { throw new Error("Transfers disabled in independent preview"); },
    orders: () => [...orders.values()],
  };
}
