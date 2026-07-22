import { GoogleGenAI } from '@google/genai';
import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

export async function POST(req: NextRequest) {
  const { original, userRewrite } = await req.json();

  if (!userRewrite || !userRewrite.trim()) {
    return NextResponse.json({ error: 'No rewrite provided' }, { status: 400 });
  }

  const prompt = `You are a professional writing coach for a non-native English speaker.
Original casual sentence: "${original}"
The learner rewrote it professionally as: "${userRewrite}"

Respond with ONLY a raw JSON object (no markdown fences, no preamble) in this exact shape:
{
  "rewrite": "a strong, natural professional model version of the original sentence",
  "feedback": "2-3 encouraging but honest sentences comparing the learner's rewrite to the model version — what worked, what could be stronger",
  "corrections": [
    {"original": "phrase from the learner's rewrite", "fixed": "stronger version", "why": "one plain sentence explaining the improvement", "tag": "e.g. Tone, Word Choice, Clarity"}
  ],
  "scores": {"grammar": 0-100, "tense": 0-100, "vocabulary": 0-100, "clarity": 0-100, "natural": 0-100, "overall": 0-100}
}
List at most 4 corrections. Be honest but kind in scoring.`;

  try {
    const response = await ai.models.generateContent({ model: 'gemini-flash-lite-latest', contents: prompt });
    const clean = (response.text ?? '').replace(/```json|```/g, '').trim();
    const parsed = JSON.parse(clean);

    const saved = await prisma.entry.create({
      data: {
        prompt: `Rewrite challenge: "${original}"`,
        text: userRewrite,
        rewrite: parsed.rewrite,
        corrections: parsed.corrections,
        scores: parsed.scores,
      },
    });

    return NextResponse.json({ ...parsed, id: saved.id });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: 'Comparison failed' }, { status: 500 });
  }
}