"use client";

import { useState } from "react";

export default function ReadingTestLayout({ test }) {
  const [currentSection, setCurrentSection] = useState(0);
  const section = test.sections[currentSection];
  const lastSectionIndex = test.sections.length - 1;

  if (!section) {
    return null;
  }

  return (
    <div className="fixed inset-0 flex bg-gray-900">
      <div className="w-[60%] h-full bg-white text-black p-6 overflow-y-auto">
        {section.passage}
      </div>

      <div className="w-[40%] h-full bg-white text-black p-6 overflow-y-auto border-l border-gray-300">
        <div className="space-y-4 pb-24">
          {section.questions.map((q) => (
            <div key={q.id}>
              <p>{q.question}</p>
              <input type="text" />
            </div>
          ))}
        </div>

        <div className="sticky bottom-0 bg-white border-t p-4 flex justify-between">
          <button
            type="button"
            onClick={() => setCurrentSection((prev) => prev - 1)}
            disabled={currentSection === 0}
          >
            Previous
          </button>

          <button
            type="button"
            onClick={() => setCurrentSection((prev) => prev + 1)}
            disabled={currentSection === lastSectionIndex}
          >
            Next
          </button>
        </div>
      </div>
    </div>
  );
}
