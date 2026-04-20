import {
  BookOpenIcon,
  MicrophoneIcon,
  PencilSquareIcon,
  SpeakerWaveIcon,
} from "@heroicons/react/24/outline";
import TestCard from "../_components/test-card";

const mockExamCards = [
  {
    title: "Listening Test 1",
    difficulty: "Easy",
    icon: SpeakerWaveIcon,
  },
  {
    title: "Reading Test 1",
    difficulty: "Medium",
    icon: BookOpenIcon,
  },
  {
    title: "Writing Test 1",
    difficulty: "Hard",
    icon: PencilSquareIcon,
  },
  {
    title: "Speaking Test 1",
    difficulty: "Medium",
    icon: MicrophoneIcon,
  },
];

export default function StudentMockExamsPage() {
  return (
    <section className="flex min-h-[calc(100vh-4rem)] flex-col">
      <header className="mb-8">
        <h1 className="text-3xl font-semibold tracking-tight">Mock Exams</h1>
      </header>

      <div className="flex flex-1 items-center justify-center">
        <div className="grid w-full max-w-5xl gap-6 md:grid-cols-2">
          {mockExamCards.map((card) => (
            <TestCard key={card.title} {...card} />
          ))}
        </div>
      </div>
    </section>
  );
}
