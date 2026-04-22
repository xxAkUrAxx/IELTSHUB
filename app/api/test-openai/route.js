import OpenAI from "openai";
import { NextResponse } from "next/server";

const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function POST() {
  if (!process.env.OPENAI_API_KEY) {
    return NextResponse.json(
      { error: "OPENAI_API_KEY is not set." },
      { status: 500 }
    );
  }

  try {
    const response = await client.responses.create({
      model: "gpt-5",
      input: "Say hello from OpenAI",
    });

    return NextResponse.json({
      message: response.output_text,
    });
  } catch (error) {
    console.error("[test-openai] OpenAI request failed:", error);

    return NextResponse.json(
      { error: "Failed to call OpenAI." },
      { status: 500 }
    );
  }
}
