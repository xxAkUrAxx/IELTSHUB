import { default as pdfParse } from "pdf-parse";
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

function normalizeLineBreaks(text) {
  return text.replace(/\r\n/g, "\n").replace(/\r/g, "\n");
}

function normalizeParagraphs(text) {
  const normalized = normalizeLineBreaks(text);
  const paragraphs = normalized
    .split(/\n\s*\n/)
    .map((paragraph) => paragraph.trim())
    .filter(Boolean);

  return paragraphs.join("\n\n");
}

function getQuestionStartIndex(text) {
  const match = /(?:^|\n)Questions?\s+\d+/i.exec(text);
  return match ? match.index : -1;
}

function buildSectionChunk(sectionText, fallbackSectionNumber) {
  const normalizedSectionText = normalizeLineBreaks(sectionText).trim();
  const lines = normalizedSectionText
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);
  const headerMatch = lines[0]?.match(/^Section\s+(\d+)\s*:?\s*(.*)$/i);
  const sectionNumber = headerMatch?.[1]
    ? Number(headerMatch[1])
    : fallbackSectionNumber;
  const title = headerMatch?.[2]?.trim() || "";
  const contentWithoutHeader = headerMatch
    ? normalizedSectionText
        .slice(normalizedSectionText.indexOf(lines[0]) + lines[0].length)
        .trim()
    : normalizedSectionText;
  const questionStartIndex = getQuestionStartIndex(contentWithoutHeader);
  const rawPassage =
    questionStartIndex >= 0
      ? contentWithoutHeader.slice(0, questionStartIndex).trim()
      : contentWithoutHeader;
  const questionText =
    questionStartIndex >= 0
      ? contentWithoutHeader.slice(questionStartIndex).trim()
      : "";

  return {
    sectionNumber,
    title,
    passage: normalizeParagraphs(rawPassage),
    questionText,
  };
}

function splitIntoSections(text) {
  const normalized = normalizeLineBreaks(text).trim();
  const matches = [...normalized.matchAll(/^Section\s+(\d+)\s*:?.*$/gim)];

  if (matches.length === 0) {
    return [buildSectionChunk(normalized, 1)];
  }

  return matches.map((match, index) => {
    const startIndex = match.index ?? 0;
    const endIndex =
      index + 1 < matches.length
        ? matches[index + 1].index ?? normalized.length
        : normalized.length;

    return buildSectionChunk(normalized.slice(startIndex, endIndex), index + 1);
  });
}

function extractQuestionNumbers(question) {
  if (!question) {
    return [];
  }

  if (question.type === "TFNG" && Array.isArray(question.questions)) {
    return question.questions
      .map((item) => String(item?.number || "").trim())
      .filter(Boolean);
  }

  if (question.type === "TABLE" && Array.isArray(question?.table?.rows)) {
    return question.table.rows
      .map((row) => String(row?.questionNumber || "").trim())
      .filter(Boolean);
  }

  return [String(question.number || "").trim()].filter(Boolean);
}

function parseRangeNumbers(rangeText) {
  const match = String(rangeText || "").match(/(\d+)\s*[-\u2013]\s*(\d+)/);
  if (!match) {
    return [];
  }

  const start = Number(match[1]);
  const end = Number(match[2]);
  const numbers = [];

  for (let current = start; current <= end; current += 1) {
    numbers.push(String(current));
  }

  return numbers;
}

function splitTableRow(line) {
  const normalizedLine = line.trim();
  const spacedCells = normalizedLine
    .split(/\s{2,}|\t+/)
    .map((cell) => cell.trim())
    .filter(Boolean);

  if (spacedCells.length >= 2) {
    return spacedCells;
  }

  const blankMatch = normalizedLine.match(/^(.*?)(_{2,}|\.{3,})(.*)$/);
  if (blankMatch) {
    return [
      blankMatch[1].trim(),
      `${blankMatch[2]} ${blankMatch[3].trim()}`.trim(),
    ].filter(Boolean);
  }

  return [normalizedLine];
}

function detectManualTableQuestion(questionText) {
  if (!/Complete the table/i.test(questionText)) {
    return null;
  }

  const lines = normalizeLineBreaks(questionText)
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);
  const instructionIndex = lines.findIndex((line) => /Complete the table/i.test(line));

  if (instructionIndex === -1) {
    return null;
  }

  const rangeLine = lines
    .slice(Math.max(0, instructionIndex - 3), instructionIndex)
    .reverse()
    .find((line) => /Questions?\s+\d+/i.test(line));
  const questionRange =
    rangeLine?.match(/(\d+\s*[-\u2013]\s*\d+)/)?.[1]?.replace(/\s+/g, "") || "";
  const rangeNumbers = parseRangeNumbers(questionRange);
  const instructionLines = lines.slice(instructionIndex, instructionIndex + 3);
  const instructions = instructionLines.join(" ").trim();

  const remainingLines = lines.slice(instructionIndex + instructionLines.length);
  const rowLines = remainingLines.filter(
    (line) =>
      /_{2,}|\.{3,}/.test(line) ||
      (rangeNumbers.length > 0 && rangeNumbers.some((number) => line.includes(number)))
  );

  if (rowLines.length === 0) {
    return null;
  }

  let headers = [];
  const rows = rowLines.map((line, index) => {
    const questionNumberMatch = line.match(/\b(\d{1,3})\b/);
    const cells = splitTableRow(
      line.replace(/^\d+\s*/, "").replace(/\s+\d+\s*$/, "").trim()
    ).map((cell) => cell.replace(/_{2,}|\.{3,}/g, "____"));
    const blankIndex = cells.findIndex((cell) => cell.includes("____"));

    return {
      cells,
      blankIndex: blankIndex >= 0 ? blankIndex : Math.max(0, cells.length - 1),
      questionNumber:
        questionNumberMatch?.[1] || rangeNumbers[index] || String(index + 1),
    };
  });

  const firstRowIndex = remainingLines.findIndex((line) => rowLines.includes(line));
  const possibleHeaderLine =
    firstRowIndex > 0 ? remainingLines[firstRowIndex - 1] : "";

  if (possibleHeaderLine && !/Choose|Question|Complete/i.test(possibleHeaderLine)) {
    headers = splitTableRow(possibleHeaderLine);
  }

  if (headers.length === 0) {
    headers = ["Prompt", "Answer"];
  }

  return {
    type: "TABLE",
    questionRange,
    instructions,
    table: {
      headers,
      rows,
    },
  };
}

function mergeQuestions(aiQuestions, manualTableQuestion) {
  if (!manualTableQuestion) {
    return aiQuestions;
  }

  const manualNumbers = new Set(extractQuestionNumbers(manualTableQuestion));
  const filteredAiQuestions = aiQuestions.filter((question) => {
    const questionNumbers = extractQuestionNumbers(question);
    return !questionNumbers.some((number) => manualNumbers.has(number));
  });

  return [manualTableQuestion, ...filteredAiQuestions];
}

async function classifyQuestionsWithAi(section) {
  if (!section.questionText) {
    return [];
  }

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
          role: "system",
          content: [
            {
              type: "input_text",
              text:
                'Identify IELTS questions from this text.\n\nReturn JSON with this shape:\n{"questions":[{"type":"","number":"","question":"","questionRange":"","instructions":"","questions":[]}]}\n\nRules:\n- Return only valid JSON\n- Keep original wording\n- DO NOT rewrite text\n- DO NOT change formatting\n- DO NOT merge paragraphs\n- Include question number for every question type\n- If the block is TRUE / FALSE / NOT GIVEN, return one TFNG object with a "questions" array\n- If a question is not grouped, return a flat object with type, number, and question',
            },
          ],
        },
        {
          role: "user",
          content: [
            {
              type: "input_text",
              text: section.questionText,
            },
          ],
        },
      ],
    });
  } catch (error) {
    console.error("OPENAI ERROR:", error);
    throw error;
  }

  console.log("RAW OPENAI RESPONSE:", response);
  console.log("AI OUTPUT:", response.output_text);

  const outputText = response.output_text || "{}";

  try {
    const parsed = JSON.parse(parseJsonFromText(outputText));
    return Array.isArray(parsed?.questions) ? parsed.questions : [];
  } catch (error) {
    console.error("JSON PARSE ERROR:", outputText);
    throw new Error("Invalid JSON from AI");
  }
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

    const buffer = Buffer.from(await file.arrayBuffer());
    const pdfResult = await pdfParse(buffer);
    const extractedText = normalizeLineBreaks(pdfResult.text || "");
    const sections = splitIntoSections(extractedText);

    const parsedSections = await Promise.all(
      sections.map(async (section, index) => {
        const aiQuestions = await classifyQuestionsWithAi(section);
        const manualTableQuestion = detectManualTableQuestion(section.questionText);

        return {
          sectionNumber: section.sectionNumber || index + 1,
          title: section.title || "",
          passage: section.passage,
          questions: mergeQuestions(aiQuestions, manualTableQuestion),
        };
      })
    );

    return NextResponse.json({
      sections: parsedSections,
    });
  } catch (error) {
    console.error("[parse-pdf] Failed to parse PDF:", error);

    return NextResponse.json(
      { error: error.message || "Unknown error" },
      { status: 500 }
    );
  }
}
