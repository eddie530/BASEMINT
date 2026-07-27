/** Loading skeletons for the launch grid and featured hero. */
export function LaunchCardSkeleton() {
  return (
    <div className="overflow-hidden rounded-2xl border border-white/10 bg-black/40">
      <div className="launch-skeleton aspect-square w-full" />
      <div className="space-y-2 p-3">
        <div className="launch-skeleton h-3 w-3/4 rounded-full" />
        <div className="launch-skeleton h-2.5 w-1/2 rounded-full" />
        <div className="launch-skeleton h-8 w-full rounded-xl" />
      </div>
    </div>
  );
}

export function LaunchGridSkeleton({ count = 4 }: { count?: number }) {
  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
      {Array.from({ length: count }).map((_, i) => (
        <LaunchCardSkeleton key={i} />
      ))}
    </div>
  );
}

export function FeaturedLaunchSkeleton() {
  return (
    <div className="overflow-hidden rounded-3xl border border-white/10 bg-black/40">
      <div className="launch-skeleton aspect-[4/3] w-full sm:aspect-[16/9]" />
      <div className="space-y-3 p-4">
        <div className="launch-skeleton h-6 w-2/3 rounded-full" />
        <div className="launch-skeleton h-3 w-1/3 rounded-full" />
        <div className="launch-skeleton h-12 w-full rounded-2xl" />
      </div>
    </div>
  );
}
