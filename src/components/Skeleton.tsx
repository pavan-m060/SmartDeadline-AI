

interface BaseSkeletonProps {
  className?: string;
}

export function SkeletonPulse({ className = "" }: BaseSkeletonProps) {
  return (
    <div 
      className={`bg-slate-800/50 rounded-xl  ${className}`}
      aria-hidden="true"
    />
  );
}

export function CardSkeleton() {
  return (
    <div className="bg-slate-900 border border-slate-800/50 p-5 rounded-xl flex flex-col justify-between h-36">
      <div className="flex items-center justify-between">
        <SkeletonPulse className="w-24 h-4" />
        <SkeletonPulse className="w-8 h-8 rounded-xl" />
      </div>
      <div className="space-y-2">
        <SkeletonPulse className="w-16 h-8" />
        <SkeletonPulse className="w-28 h-3.5" />
      </div>
    </div>
  );
}

export function NotificationSkeleton() {
  return (
    <div className="space-y-3">
      {[1, 2, 3].map((i) => (
        <div key={i} className="p-3.5 rounded-xl bg-slate-900 border border-slate-800/50 flex gap-3 items-start">
          <SkeletonPulse className="w-8 h-8 rounded-lg shrink-0" />
          <div className="flex-1 space-y-2">
            <div className="flex items-center justify-between">
              <SkeletonPulse className="w-1/3 h-4" />
              <SkeletonPulse className="w-12 h-3.5" />
            </div>
            <SkeletonPulse className="w-5/6 h-3.5" />
          </div>
        </div>
      ))}
    </div>
  );
}

export function TaskListSkeleton() {
  return (
    <div className="space-y-3">
      {[1, 2, 3].map((i) => (
        <div key={i} className="p-4 rounded-xl bg-slate-900 border border-slate-800/50 flex items-center justify-between">
          <div className="flex items-center gap-3 w-1/2">
            <SkeletonPulse className="w-5 h-5 rounded" />
            <div className="space-y-2 flex-1">
              <SkeletonPulse className="w-3/4 h-4" />
              <SkeletonPulse className="w-1/3 h-3" />
            </div>
          </div>
          <div className="flex items-center gap-3">
            <SkeletonPulse className="w-16 h-5 rounded-md" />
            <SkeletonPulse className="w-12 h-5 rounded-md" />
          </div>
        </div>
      ))}
    </div>
  );
}

export function StudyPlanSkeleton() {
  return (
    <div className="space-y-6">
      <div className="p-6 rounded-xl bg-slate-900 border border-slate-800/50 space-y-3">
        <SkeletonPulse className="w-24 h-4" />
        <SkeletonPulse className="w-full h-12" />
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="p-6 rounded-xl bg-slate-900 border border-slate-800/50 space-y-4">
          <SkeletonPulse className="w-1/3 h-5" />
          <div className="space-y-3">
            <SkeletonPulse className="w-full h-10" />
            <SkeletonPulse className="w-full h-10" />
            <SkeletonPulse className="w-full h-10" />
          </div>
        </div>
        <div className="p-6 rounded-xl bg-slate-900 border border-slate-800/50 space-y-4">
          <SkeletonPulse className="w-1/3 h-5" />
          <div className="space-y-3">
            <SkeletonPulse className="w-full h-10" />
            <SkeletonPulse className="w-full h-10" />
            <SkeletonPulse className="w-full h-10" />
          </div>
        </div>
      </div>
    </div>
  );
}
