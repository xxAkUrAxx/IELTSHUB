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

    const arrayBuffer = await file.arrayBuffer();
    const base64File = Buffer.from(arrayBuffer).toString("base64");

    let response;
    try {
      response = await client.responses.create({
        model: "gpt-4o-mini",
        input: [
          {
            role: "user",
            content: [
              {
                type: "input_file",
                filename: file.name,
                file_data: base64File,
              },
              {
                type: "input_text",
                text: `Read this IELTS reading test PDF and convert it into JSON:
{
  "sections": [
    {
      "passage": "",
      "questions": [
        {
          "type": "TFNG | MCQ | FILL_BLANK | MATCHING",
          "question": "",
          "options": [],
          "correctAnswer": ""
        }
      ]
    }
  ]
}

Return valid JSON only.`,
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

    const outputText = parseJsonFromText(response.output_text || "{}");

    let parsedResult;
    try {
      parsedResult = JSON.parse(outputText);
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
