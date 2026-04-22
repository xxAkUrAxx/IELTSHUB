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
                text: `You are an IELTS parser.
Return ONLY valid JSON.
Do not include explanations.
Do not include text outside JSON.
Ensure the JSON is properly formatted and parseable.

Parse this IELTS reading test PDF into structured JSON.

Your job is to extract structured data from IELTS Reading test PDFs.

Rules:
- Detect sections (Section 1, 2, 3)
- Extract full passage text per section
- Extract ALL questions
- Identify question type correctly:
  - TFNG (True/False/Not Given)
  - YESNO (Yes/No/Not Given)
  - MCQ (Multiple Choice)
  - MATCHING
  - FILL_BLANK
  - SUMMARY
  - TABLE
- Preserve question numbering
- Detect blanks (____ or dotted lines)
- Extract options (A, B, C, D if present)
- Do NOT guess answers (leave correctAnswer empty)

Return ONLY valid JSON.

FORMAT:

{
  "sections": [
    {
      "sectionNumber": 1,
      "passage": "full passage text",
      "questions": [
        {
          "number": 1,
          "type": "FILL_BLANK",
          "question": "timber for houses and the making of ____",
          "options": [],
          "correctAnswer": ""
        }
      ]
    }
  ]
}

IMPORTANT:
- No explanations
- No extra text
- Only JSON output`,
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
