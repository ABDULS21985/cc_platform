export function CommunitySkeleton() {
  return (
    <div className="bg-white rounded-3xl overflow-hidden border border-gray-100 shadow-sm animate-pulse h-full flex flex-col">
      {/* Cover Image Skeleton */}
      <div className="h-44 bg-gradient-to-br from-gray-100 via-gray-150 to-gray-100 relative flex-shrink-0">
        {/* Shimmer effect */}
        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent animate-shimmer" />
        {/* Simulated badges */}
        <div className="absolute top-3 left-3 h-6 w-20 bg-gray-200/70 rounded-full" />
        <div className="absolute top-3 right-3 h-6 w-14 bg-gray-200/70 rounded-full" />
        {/* Simulated avatar position */}
        <div className="absolute -bottom-5 left-4 w-12 h-12 bg-gray-200 rounded-xl border-2 border-white shadow-sm" />
      </div>

      {/* Card Body Skeleton */}
      <div className="pt-8 pb-5 px-5 flex flex-col flex-1 gap-3">
        {/* Title */}
        <div className="h-5 bg-gray-100 rounded-lg w-3/4" />
        {/* Description lines */}
        <div className="space-y-2">
          <div className="h-3 bg-gray-50 rounded-lg w-full" />
          <div className="h-3 bg-gray-50 rounded-lg w-4/5" />
        </div>

        {/* Action Row */}
        <div className="flex items-center justify-between mt-auto pt-3 border-t border-gray-50">
          <div className="h-4 w-24 bg-gray-50 rounded-lg" />
          <div className="h-8 w-20 bg-gray-100 rounded-xl" />
        </div>
      </div>
    </div>
  );
}
