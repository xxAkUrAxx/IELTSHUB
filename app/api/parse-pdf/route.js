import OpenAI from "openai";
import { NextResponse } from "next/server";

const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

function parseJsonFromText(text) {
  const trimmedText = text.trim();
  return trimmedText
    .replace(/^```json\s*/i, "")
    .replace(/^```\s*/i, "")
    .replace(/\s*```$/, "");
}

export async function POST(request) {
  if (!process.env.OPENAI_API_KEY) {
    return NextResponse.json(
      { error: "OPENAI_API_KEY is not set." },
      { status: 500 }
    );
  }

  try {
    const formData = await request.formData();
    const file = formData.get("file");

    if (!(file instanceof File)) {
      return NextResponse.json(
        { error: "A PDF file is required." },
        { status: 400 }
      );
    }

    if (file.type !== "application/pdf" && !file.name.toLowerCase().endsWith(".pdf")) {
      return NextResponse.json(
        { error: "Only PDF files are allowed." },
        { status: 400 }
      );
    }

    const uploadedFile = await client.files.create({
      file,
      purpose: "assistants",
    });

    let response;
    try {
      response = await client.responses.create({
        model: "gpt-4o-mini",
        text: {
          format: {
            type: "json_object",
          },
        },
        input: [
          {
            role: "user",
            content: [
              {
                type: "input_text",
                text: `You are an IELTS Reading test parser.

You must identify IELTS question patterns using examples.

---

EXAMPLE 1 (TABLE COMPLETION):

INPUT:

Questions 1–7
Complete the table below.
Choose ONE WORD ONLY from the passage.

[Table with rows and blanks]

OUTPUT:

{
  "type": "TABLE",
  "questionRange": "1-7",
  "instructions": "Complete the table below. Choose ONE WORD ONLY from the passage.",
  "table": {
    "headers": ["Section of website", "Comments"],
    "rows": [
      {
        "cells": ["Database of tourism services", "allowed businesses to ____ information regularly"],
        "blankIndex": 1,
        "questionNumber": 1
      }
    ]
  }
}

---

RULES:

1. TABLE DETECTION
- If you see:
  - "Complete the table"
  - structured rows/columns
  - numbered blanks (1,2,3...)

-> MUST group as ONE TABLE question

---

2. DO NOT SPLIT TABLE INTO MULTIPLE QUESTIONS

X WRONG:
- multiple FILL_BLANK questions

CORRECT:
- ONE TABLE object with multiple blanks

---

3. INSTRUCTION DETECTION

- Extract full instruction block BEFORE table
- Store as "instructions"

---

4. QUESTION NUMBERS

- Extract numbers (1-7)
- Assign each blank to correct number
- Extract question number for ALL question types

---

5. PASSAGE RULES

- Keep formatting
- Keep paragraphs
- Keep headings

---

6. TFNG DETECTION

If you see:
"TRUE / FALSE / NOT GIVEN"

-> create:

{
  "type": "TFNG",
  "questionRange": "8-13",
  "instructions": "...",
  "questions": [...]
}

EXAMPLE (TFNG):

INPUT:

Questions 8-13

Do the following statements agree with the information given in Reading Passage 1?

In boxes 8-13 on your answer sheet, write

TRUE if the statement agrees with the information
FALSE if the statement contradicts the information
NOT GIVEN if there is no information on this

8 The website www.newzealand.com aimed to provide ready-made itineraries and packages for travel companies and individual tourists.
9 It was found that most visitors started searching on the website by geographical location.

OUTPUT:

{
  "type": "TFNG",
  "questionRange": "8-13",
  "instructions": "Do the following statements agree with the information given in Reading Passage 1?",
  "questions": [
    {
      "number": 8,
      "question": "The website www.newzealand.com aimed to provide ready-made itineraries and packages for travel companies and individual tourists.",
      "options": ["TRUE", "FALSE", "NOT GIVEN"],
      "correctAnswer": ""
    },
    {
      "number": 9,
      "question": "It was found that most visitors started searching on the website by geographical location.",
      "options": ["TRUE", "FALSE", "NOT GIVEN"],
      "correctAnswer": ""
    }
  ]
}

RULES:

1. DETECTION
If text contains:
- "TRUE / FALSE / NOT GIVEN"
- numbered statements (8, 9, 10...)

-> classify as TFNG

2. GROUPING
- ALL statements must be inside ONE TFNG block
- DO NOT split into separate question types

3. OPTIONS
Always assign:
["TRUE", "FALSE", "NOT GIVEN"]

4. QUESTION EXTRACTION
- Extract ONLY the statement text
- Remove numbering from question text

5. INSTRUCTIONS
- Extract the instruction sentence above the questions

6. OUTPUT
- Must be valid JSON only
- No explanation text

---

7. OUTPUT FORMAT

{
  "sections": [
    {
      "sectionNumber": 1,
      "title": "",
      "passage": "",
      "questions": []
    }
  ]
}

---

IMPORTANT:

- Return ONLY JSON
- No explanation
- Do not guess answers
- Preserve structure exactly`,
              },
              {
                type: "input_file",
                file_id: uploadedFile.id,
              },
            ],
          },
        ],
      });
    } catch (error) {
      console.error("OPENAI ERROR:", error);
      return NextResponse.json(
        { error: error.message || "Unknown error" },
        { status: 500 }
      );
    }

    console.log("RAW OPENAI RESPONSE:", response);
    console.log("AI OUTPUT:", response.output_text);

    const outputText = response.output_text || "{}";

    let parsedResult;
    try {
      parsedResult = JSON.parse(parseJsonFromText(outputText));
    } catch (err) {
      console.error("JSON PARSE ERROR:", outputText);
      return NextResponse.json(
        { error: "Invalid JSON from AI", raw: outputText },
        { status: 500 }
      );
    }

    return NextResponse.json(parsedResult);
  } catch (error) {
    console.error("[parse-pdf] Failed to parse PDF:", error);

    return NextResponse.json(
      { error: error.message || "Unknown error" },
      { status: 500 }
    );
  }
}
