import { GoogleGenAI } from '@google/genai';
import { NextResponse } from 'next/server';

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

export async function GET() {
  const prompt = `Generate a short listening comprehension exercise for a non-native English speaker. Draw from everyday life (not just tech/work), avoid religion.
Respond with ONLY a raw JSON object (no markdown fences, no preamble) in this exact shape:
{
  "passage": "a natural-sounding short passage, 4-6 sentences, written to be read aloud",
  "questions": [
    {"question": "a comprehension question about the passage", "options": ["a", "b", "c", "d"], "correctIndex": 0, "explanation": "one short sentence explaining the answer"}
  ]
}
Include exactly 3 questions.`;

  try {
    const response = await ai.models.generateContent({ model: 'gemini-flash-lite-latest', contents: prompt });
    const clean = (response.text ?? '').replace(/```json|```/g, '').trim();
    const data = JSON.parse(clean);
    return NextResponse.json(data);
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: 'Could not generate a passage' }, { status: 500 });
  }
}