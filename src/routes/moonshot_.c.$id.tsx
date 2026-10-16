import { createFileRoute } from "@tanstack/react-router";
import { useEffect } from "react";

/** Shareable challenge link. Social crawlers read the meta tags; people are sent into the game. */
export const Route = createFileRoute("/moonshot_/c/$id")({
  head: ({ params }) => {
    const image = `https://basemint.dev/api/public/moonshot/card?id=${encodeURIComponent(params.id)}`;
    return {
      meta: [
        { title: "Beat this MOONSHOT flight · BaseMint" },
        { name: "description", content: "A friend banked a verified MOONSHOT flight. Can you beat it? Play money only." },
        { property: "og:title", content: "Beat this MOONSHOT flight" },
        { property: "og:description", content: "A verified MOONSHOT round. Can you cash out higher?" },
        { property: "og:type", content: "website" },
        { name: "twitter:card", content: "summary_large_image" },
        { property: "og:image", content: image },
        { name: "twitter:image", content: image },
      ],
    };
  },
  component: ChallengeLink,
});

function ChallengeLink() {
  const { id } = Route.useParams();
  const href = `/moonshot?challenge=${encodeURIComponent(id)}`;
  useEffect(() => {
    window.location.replace(href);
  }, [href]);
  return (
    <div className="p-10 text-center">
      <a href={href}>Open this MOONSHOT challenge →</a>
    </div>
  );
}
