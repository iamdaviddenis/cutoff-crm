export default function DashboardLoading() {
  return (
    <div className="mx-auto w-full max-w-7xl animate-pulse space-y-10 pb-12">
      <div className="h-40 rounded-3xl bg-slate-200/80" />
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="h-32 rounded-2xl bg-slate-200/70" />
        ))}
      </div>
      <div className="grid gap-6 lg:grid-cols-2">
        <div className="h-56 rounded-2xl bg-slate-200/70" />
        <div className="h-56 rounded-2xl bg-slate-200/70" />
      </div>
    </div>
  );
}
