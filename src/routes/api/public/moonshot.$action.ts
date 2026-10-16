import { createFileRoute } from "@tanstack/react-router";

const run = async (request: Request, action: string) => {
  const { handle } = await import("@/moonshot/server/api.server");
  return handle(request, action);
};

export const Route = createFileRoute("/api/public/moonshot/$action")({
  server: {
    handlers: {
      GET: ({ request, params }) => run(request, params.action),
      POST: ({ request, params }) => run(request, params.action),
    },
  },
});
