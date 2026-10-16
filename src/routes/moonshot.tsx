import { createFileRoute } from "@tanstack/react-router";
import { Moonshot } from "@/moonshot/Moonshot";
import moonshotCss from "@/moonshot/moonshot.css?url";

export const Route = createFileRoute("/moonshot")({
  head: () => ({
    meta: [
      { title: "MOONSHOT · Daily Flight Club on BaseMint" },
      {
        name: "description",
        content:
          "MOONSHOT — cash out before the rug. Free practice plus ten server-scored daily flights. Play money only.",
      },
      { property: "og:title", content: "MOONSHOT · Daily Flight Club" },
      {
        property: "og:description",
        content: "Cash out before the rug. Ten daily flights, friend circles and challenges. Play money only.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
    links: [{ rel: "stylesheet", href: moonshotCss }],
  }),
  component: Moonshot,
});
