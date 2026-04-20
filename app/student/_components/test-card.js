export default function TestCard({
  title,
  difficulty,
  icon: Icon,
}) {
  return (
    <div className="card border border-base-300 bg-base-100 shadow-sm">
      <div className="card-body gap-5">
        <div className="flex items-start justify-between gap-4">
          <div className="space-y-2">
            <h2 className="card-title text-xl">{title}</h2>
            <div className="badge badge-outline">{difficulty}</div>
          </div>

          <div className="rounded-2xl bg-base-200 p-3 text-base-content/75">
            <Icon className="h-6 w-6" />
          </div>
        </div>

        <div className="card-actions justify-end">
          <button type="button" className="btn btn-primary">
            Start
          </button>
        </div>
      </div>
    </div>
  );
}
