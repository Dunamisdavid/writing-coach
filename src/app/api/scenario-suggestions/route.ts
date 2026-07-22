import { GoogleGenAI } from '@google/genai';
import { NextResponse } from 'next/server';

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

export async function GET() {
    const prompt = `Generate 8 diverse, interesting conversation practice scenarios for a non-native English speaker to practice speaking naturally in realistic situations.
Respond with ONLY a raw JSON array (no markdown fences, no preamble) in this exact shape:
[
  {"label": "short 2-4 word name", "icon": "one relevant emoji", "persona": "one sentence describing who the AI should roleplay as and how they should behave"}
]
Draw from many areas of life — family, friendships, romance, health, money, travel, community, parenting, hobbies, work, and everyday situations. Do not focus heavily on any one profession. Do not include religious or spiritual scenarios. Keep everything appropriate for a general audience.`;
    try {
        const response = await ai.models.generateContent({ model: 'gemini-flash-lite-latest', contents: prompt });
        const clean = (response.text ?? '').replace(/```json|```/g, '').trim();
        const scenarios = JSON.parse(clean);
        return NextResponse.json(scenarios);
    } catch (err) {
        console.error(err);
        return NextResponse.json({ error: 'Could not generate scenarios' }, { status: 500 });
    }
}