import { GoogleGenAI } from '@google/genai';
import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

export async function POST(req: NextRequest) {
    const { scenario, messages } = await req.json();
    const learnerLines = messages.filter((m: any) => m.role === 'user').map((m: any) => m.content).join('\n');

    const prompt = `You are a precise, encouraging English communication coach for a non-native speaker who is a professional web developer.
Below are ONLY the learner's lines from a roleplay conversation (scenario: ${scenario}). Evaluate their English across the whole conversation.
Respond with ONLY a raw JSON object (no markdown fences, no preamble) with this exact shape:
{
  "rewrite": "a short model example of how a fluent speaker might have handled the conversation overall",
  "corrections": [
    {"original": "short original phrase", "fixed": "corrected phrase", "why": "one plain sentence explaining the rule", "tag": "e.g. Tense, Word Choice, Preposition"}
  ],
  "scores": {"grammar": 0-100, "tense": 0-100, "vocabulary": 0-100, "clarity": 0-100, "natural": 0-100, "overall": 0-100}
}
List at most 6 of the most useful corrections. Be honest but kind in scoring.
Learner's lines:
"""${learnerLines}"""`;

    try {
        const response = await ai.models.generateContent({ model: 'gemini-flash-lite-latest', contents: prompt });
        const clean = (response.text ?? '').replace(/```json|```/g, '').trim();
        const parsed = JSON.parse(clean);

        const saved = await prisma.entry.create({
            data: {
                prompt: `Conversation: ${scenario}`,
                text: learnerLines,
                rewrite: parsed.rewrite,
                corrections: parsed.corrections,
                scores: parsed.scores,
            },
        });

        return NextResponse.json({ ...parsed, id: saved.id });
    } catch (err: any) {
        console.error(err);
        if (err?.status === 429) {
            return NextResponse.json(
                { error: "You've hit the free plan's request limit for now — try again in about a minute." },
                { status: 429 }
            );
        }
        return NextResponse.json({ error: 'Feedback failed' }, { status: 500 });
    }
}