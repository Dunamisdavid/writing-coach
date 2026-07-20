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
        const response = await callWithRetry(prompt);
        if (!response) {
            throw new Error('AI response was empty');
        }

        const raw = response.text ?? '';
        const clean = raw.replace(/```json|```/g, '').trim();
        const parsed = JSON.parse(clean);

        return NextResponse.json(parsed);
    } catch (err) {
        console.error(err);
        return NextResponse.json({ error: 'AI check failed' }, { status: 500 });
    }

    async function callWithRetry(prompt: string, attempts = 2) {
  for (let i = 0; i < attempts; i++) {
    try {
      return await ai.models.generateContent({
        model: 'gemini-flash-latest',
        contents: prompt,
      });
    } catch (err: any) {
      const isOverloaded = err?.status === 503;
      if (isOverloaded && i < attempts - 1) {
        await new Promise((r) => setTimeout(r, 1500)); // wait 1.5s and retry
        continue;
      }
      throw err;
    }
  }
}
}
