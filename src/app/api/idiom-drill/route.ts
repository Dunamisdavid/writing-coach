import { GoogleGenAI } from '@google/genai';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

export async function GET() {
  const prompt = `You are an English idiom and natural-expression drill generator for a non-native speaker.
Generate exactly 5 multiple-choice questions testing common English idioms, phrasal verbs, or natural everyday expressions (e.g. "break the ice", "hang in there", "hit the books"). Mix meaning-matching and fill-in-the-blank formats.
Respond with ONLY a raw JSON array (no markdown fences, no preamble) in this exact shape:
[
  {
    "sentence": "either a fill-in-the-blank sentence, or a question like 'What does \"break the ice\" mean?'",
    "options": ["option a", "option b", "option c", "option d"],
    "correctIndex": 0,
    "explanation": "one short sentence explaining the idiom's meaning or usage"
  }
]`;

  try {
    const response = await ai.models.generateContent({ model: 'gemini-flash-lite-latest', contents: prompt });
    const clean = (response.text ?? '').replace(/```json|```/g, '').trim();
    const questions = JSON.parse(clean);
    return NextResponse.json(questions);
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: 'Could not generate a drill' }, { status: 500 });
  }
}