'use client';

export default function SkeletonCode() {
  return (
    <div className="p-4 md:p-8 bg-dark-800 animate-pulse">
      <div className="space-y-2">
        {/* Line numbers + code lines */}
        {[...Array(12)].map((_, i) => (
          <div key={i} className="flex items-center gap-3">
            <div className="w-6 h-3 bg-dark-600 rounded" />
            <div
              className="h-3 bg-dark-600 rounded"
              style={{
                width: `${Math.max(20, Math.min(90, 30 + Math.random() * 60))}%`,
              }}
            />
          </div>
        ))}
      </div>
    </div>
  );
}
