export default function SkeletonLoader() {
  return (
    <div className="animate-pulse space-y-4">
      <div className="h-4 bg-neutral-700 rounded w-3/4"></div>
      <div className="h-4 bg-neutral-700 rounded w-1/2"></div>
      <div className="grid grid-cols-2 gap-4">
        <div className="h-10 bg-neutral-700 rounded"></div>
        <div className="h-10 bg-neutral-700 rounded"></div>
      </div>
    </div>
  );
}
