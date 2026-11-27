import { describe, expect, it, vi } from "vitest";
import { residentIndependentAI } from "./resident-independent-ai.server";
const input = { instructions: "test", input: [{ role: "user" as const, content: "hello" }], max_output_tokens: 2000 };
const env = { RESIDENT_AI_API_KEY: "mock-only", RESIDENT_AI_MODEL: "mock-model" };
describe("independent AI adapter", () => {
  it("fails without configuration before network access", async () => {
    const request = vi.fn<typeof fetch>();
    await expect(residentIndependentAI(input, {}, request)).rejects.toThrow("not configured");
    expect(request).not.toHaveBeenCalled();
  });
  it("extracts text and limits output without storage", async () => {
    const request = vi.fn<typeof fetch>().mockResolvedValue(new Response(JSON.stringify({ output: [{ type: "message", content: [{ type: "output_text", text: "answer" }] }] })));
    expect(await residentIndependentAI(input, env, request)).toBe("answer");
    const body = JSON.parse(String(request.mock.calls[0][1]?.body));
    expect(body.max_output_tokens).toBe(1600);
    expect(body.store).toBe(false);
    expect(body.tools).toBeUndefined();
  });
  it("does not expose provider error bodies", async () => {
    const request = vi.fn<typeof fetch>().mockResolvedValue(new Response("private detail", { status: 401 }));
    await expect(residentIndependentAI(input, env, request)).rejects.toThrow("Independent AI request failed");
  });
});
