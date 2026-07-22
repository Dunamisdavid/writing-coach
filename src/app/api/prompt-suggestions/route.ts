import { GoogleGenAI } from '@google/genai';
import { NextRequest, NextResponse } from 'next/server';

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

const TYPE_INSTRUCTIONS: Record<string, string> = {
  write: "Generate 6 diverse, realistic writing practice prompts for a non-native English speaker. Draw from many different areas of life — family, relationships, health, money, travel, food, hobbies, work, community, current events, personal growth, etc. Do not focus on any one profession or industry. Do not include religion or spiritual topics. Keep each prompt to ONE short sentence, no more than 12 words.",
  speak: "Generate 6 diverse, realistic short speaking practice topics for a non-native English speaker to talk about out loud for 30-60 seconds. Draw from many different areas of life — family, relationships, health, money, travel, food, hobbies, work, community, current events, personal growth, etc. Do not focus on any one profession or industry. Do not include religion or spiritual topics. Keep each topic to ONE short sentence, no more than 10 words.",
  rewrite: "Generate 6 casual, informal one-sentence messages (the way someone might text a friend quickly — lowercase, contractions, a little sloppy) that a non-native English speaker could practice rewriting into professional English. Draw from everyday life broadly, not just work. Keep each under 12 words. Do not include religion or spiritual topics.",
};

export async function GET(req: NextRequest) {
  const type = req.nextUrl.searchParams.get('type') || 'write';
  const instruction = TYPE_INSTRUCTIONS[type] || TYPE_INSTRUCTIONS.write;

  const prompt = `${instruction}
Respond with ONLY a raw JSON array of strings (no markdown fences, no preamble), like:
["item one", "item two", "item three"]`;

  try {
    const response = await ai.models.generateContent({ model: 'gemini-flash-lite-latest', contents: prompt });
    const clean = (response.text ?? '').replace(/```json|```/g, '').trim();
    const items = JSON.parse(clean);
    return NextResponse.json(items);
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: 'Could not generate prompts' }, { status: 500 });
  }
}