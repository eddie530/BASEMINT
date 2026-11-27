// Server-only, dependency-free Responses API adapter. No tools or transactions.
type Input = { role: "user" | "assistant"; content: string };
export async function residentIndependentAI(
  input: { instructions: string; input: Input[]; max_output_tokens: number },
  env: Record<string, string | undefined> = process.env,
  request: typeof fetch = fetch,
): Promise<string> {
  const key = env.RESIDENT_AI_API_KEY;
  const model = env.RESIDENT_AI_MODEL;
  if (!key || !model) throw new Error("Independent AI is not configured");
  const response = await request("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify({ ...input, model, store: false, max_output_tokens: Math.min(1600, input.max_output_tokens) }),
    signal: AbortSignal.timeout(30000),
  });
  if (!response.ok) throw new Error("Independent AI request failed");
  const body = await response.json() as { output?: Array<{ type: string; content?: Array<{ type: string; text?: string; refusal?: string }> }> };
  const answer = (body.output ?? []).flatMap(item => item.type === "message" ? (item.content ?? []).flatMap(part => part.type === "output_text" ? [part.text ?? ""] : part.type === "refusal" ? [part.refusal ?? ""] : []) : []).join("\n").trim();
  if (!answer) throw new Error("Empty AI response");
  return answer;
}
