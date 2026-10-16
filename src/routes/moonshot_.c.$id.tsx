import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect } from "react";
import { getChallengeMeta } from "@/moonshot/challenge.functions";

/** Shareable challenge link. Crawlers read the meta tags; people are sent into the game. */
export const Route = createFileRoute("/moonshot_/c/$id")({
  loader: ({ params }) => getChallengeMeta({ data: { id: params.id } }),
  head: ({ loaderData }) => {
    const c = loaderData?.challenge;
    if (!loaderData || !c)
      return {
        meta: [
          { title: "MOONSHOT challenge not found · BaseMint" },
          { name: "description", content: "This MOONSHOT challenge link is invalid or no longer available." },
          { property: "og:title", content: "MOONSHOT challenge not found" },
          { property: "og:description", content: "This challenge link is invalid or no longer available." },
          { property: "og:type", content: "website" },
          { name: "twitter:card", content: "summary" },
          { name: "robots", content: "noindex" },
        ],
      };
    const o = loaderData.origin;
    const id = encodeURIComponent(c.id);
    const image = `${o}/api/public/moonshot/card?id=${id}`;
    const embed = JSON.stringify({
      version: "1",
      imageUrl: `${o}/api/public/moonshot/card?id=${id}&format=embed`,
      button: {
        title: "Beat this flight",
        action: {
          type: "launch_miniapp",
          name: "MOONSHOT",
          url: `${o}/moonshot?challenge=${id}`,
          splashImageUrl: `${o}/splash.png`,
          splashBackgroundColor: "#080b13",
        },
      },
    });
    const frame = embed.replace('"launch_miniapp"', '"launch_frame"');
    const title = `Beat ${c.multiplier.toFixed(2)}× on MOONSHOT`;
    return {
      meta: [
        { title: `${title} · BaseMint` },
        { name: "description", content: `${c.name} banked a verified ${c.multiplier.toFixed(2)}× MOONSHOT flight. Can you beat it? Play money only.` },
        { property: "og:title", content: title },
        { property: "og:description", content: "A verified MOONSHOT round. Can you cash out higher? Play money only." },
        { property: "og:type", content: "website" },
        { property: "og:url", content: c.url },
        { name: "twitter:card", content: "summary_large_image" },
        { property: "og:image", content: image },
        { property: "og:image:type", content: "image/png" },
        { property: "og:image:width", content: "1200" },
        { property: "og:image:height", content: "630" },
        { name: "twitter:image", content: image },
        { name: "fc:miniapp", content: embed },
        { name: "fc:frame", content: frame },
      ],
    };
  },
  component: ChallengeLink,
});

function ChallengeLink() {
  const { challenge } = Route.useLoaderData();
  const href = challenge ? `/moonshot?challenge=${encodeURIComponent(challenge.id)}` : null;
  useEffect(() => {
    if (href) window.location.replace(href);
  }, [href]);
  return (
    <div className="p-10 text-center">
      {href ? (
        <a href={href}>Open this MOONSHOT challenge →</a>
      ) : (
        <>
          <p>This MOONSHOT challenge isn’t available.</p>
          <Link to="/moonshot">Play MOONSHOT →</Link>
        </>
      )}
    </div>
  );
}
