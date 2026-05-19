"use client";

import Link from "next/link";

function formatCreatedAt(createdAt) {
  if (!createdAt) {
    return "Unknown date";
  }

  const parsedDate = new Date(createdAt);

  if (Number.isNaN(parsedDate.getTime())) {
    return "Unknown date";
  }

  return parsedDate.toLocaleDateString();
}

function getDifficultyBadgeStyle(difficulty) {
  const normalizedDifficulty = String(difficulty).toLowerCase();

  if (normalizedDifficulty === "easy") {
    return {
      borderColor: "#4CCD99",
      color: "#4CCD99",
      backgroundColor: "rgba(76, 205, 153, 0.12)",
    };
  }

  if (normalizedDifficulty === "hard") {
    return {
      borderColor: "#AE2448",
      color: "#AE2448",
      backgroundColor: "rgba(174, 36, 72, 0.12)",
    };
  }

  return {
    borderColor: "#FFC700",
    color: "#FFC700",
    backgroundColor: "rgba(255, 199, 0, 0.12)",
  };
}

export default function TestCard({
  title,
  difficulty,
  icon: Icon,
  href = "",
  createdAt = "",
  completed = false,
  bandScore = null,
}) {
  function handleReview() {
    window.alert("Review mode is coming soon.");
  }

  const difficultyBadgeStyle = getDifficultyBadgeStyle(difficulty);

  return (
    <article className="card border border-base-300 bg-base-100 shadow-sm">
      <div className="card-body gap-4 p-6">
        <div className="flex items-start justify-between gap-4">
          <div className="space-y-2">
            <h2 className="text-xl font-semibold tracking-tight">{title}</h2>
            {completed ? (
              <div className="badge badge-success badge-outline">Completed</div>
            ) : (
              <div
                className="badge badge-outline"
                style={difficultyBadgeStyle}
              >
                {difficulty}
              </div>
            )}
          </div>

          <div className="flex items-start gap-3">
            {completed && bandScore ? (
              <div className="flex h-16 w-16 items-center justify-center rounded-full border-4 border-success/30 bg-success/10 text-center">
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-wide text-success">
                    Band
                  </p>
                  <p className="text-lg font-bold text-success">{bandScore}</p>
                </div>
              </div>
            ) : null}

            <div
              className={`rounded-2xl p-3 ${
                completed
                  ? "bg-success/10 text-success"
                  : "bg-base-200 text-base-content/75"
              }`}
            >
              <Icon className="h-6 w-6" />
            </div>
          </div>
        </div>

        <p className="text-sm text-base-content/65">
          Created: {formatCreatedAt(createdAt)}
        </p>

        {completed ? (
          <div className="card-actions justify-end gap-2">
            <button
              type="button"
              className="btn btn-outline"
              onClick={handleReview}
            >
              Review Test
            </button>
            <Link href={href || "#"} className="btn btn-success">
              Retake Test
            </Link>
          </div>
        ) : (
          <div className="card-actions justify-end">
            <Link href={href || "#"} className="btn btn-primary">
              Start Test
            </Link>
          </div>
        )}
      </div>
    </article>
  );
}
