import { AcademicCapIcon } from "@heroicons/react/24/solid";

export default function StudentPageHeader({
  title,
  subtitle = "",
  overallAverageBand = 7.5,
}) {
  return (
    <header className="mb-8 flex items-start justify-between gap-6">
      <div className="min-w-0">
        <h1 className="text-3xl font-semibold tracking-tight">{title}</h1>

        {subtitle ? (
          <p className="mt-3 text-base font-medium text-base-content/70">
            {subtitle}
          </p>
        ) : null}
      </div>

      <div className="ml-auto shrink-0">
        <div className="flex w-[148px] flex-col items-center rounded-[20px] border border-base-300 bg-base-100 px-3 py-3 text-center shadow-sm">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-info/12 text-info">
            <AcademicCapIcon className="h-5 w-5" />
          </div>

          <p className="mt-2 w-full text-center text-[10px] font-bold uppercase tracking-[0.18em] text-base-content/45">
            Overall Avg Band
          </p>
          <p className="mt-1 w-full text-center text-2xl font-black leading-none tracking-tight tabular-nums">
            {overallAverageBand.toFixed(1)}
          </p>
        </div>
      </div>
    </header>
  );
}
