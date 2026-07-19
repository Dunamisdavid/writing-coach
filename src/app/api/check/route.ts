import { GoogleGenAI } from '@google/genai';
import { NextRequest, NextResponse } from 'next/server';

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

export async function POST(req: NextRequest) {
    const { text } = await req.json();

    if (!text || !text.trim()) {
        return NextResponse.json({ error: 'No text provided' }, { status: 400 });
    }

    const prompt = `You are a precise, encouraging English writing coach for a non-native speaker who is a professional web developer.
Given the learner's text, respond with ONLY a raw JSON object (no markdown fences, no preamble) with this exact shape:
{
  "rewrite": "the corrected, natural version of their full text",
  "corrections": [
    {"original": "short original phrase", "fixed": "short corrected phrase", "why": "one plain sentence explaining the rule", "tag": "e.g. Tense, Article, Preposition, Word Choice, Plural"}
  ],
  "scores": {"grammar": 0-100, "tense": 0-100, "vocabulary": 0-100, "clarity": 0-100, "natural": 0-100, "overall": 0-100}
}
List at most 6 of the most useful corrections, ordered by importance. Be honest but kind in scoring.
Text to check: """${text}"""`;

    try {
        const response = await ai.models.generateContent({
            model: 'gemini-flash-latest',
            contents: prompt,
        });

        const raw = response.text ?? '';
        const clean = raw.replace(/```json|```/g, '').trim();
        const parsed = JSON.parse(clean);

        return NextResponse.json(parsed);
    } catch (err) {
        console.error(err);
        return NextResponse.json({ error: 'AI check failed' }, { status: 500 });
    }
}