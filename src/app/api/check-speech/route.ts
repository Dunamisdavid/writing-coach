import { GoogleGenAI } from '@google/genai';
import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

export async function POST(req: NextRequest) {
    const { audioBase64, mimeType, prompt: userPrompt } = await req.json();

    if (!audioBase64) {
        return NextResponse.json({ error: 'No audio provided' }, { status: 400 });
    }

    const instruction = `You are a precise, encouraging English speaking coach for a non-native speaker who is a professional web developer.
Listen to this audio recording. First transcribe exactly what was said, then evaluate it.
Respond with ONLY a raw JSON object (no markdown fences, no preamble) with this exact shape:
{
  "transcript": "exact transcription of what they said",
  "rewrite": "a more natural, fluent way to say the same thing",
  "corrections": [
    {"original": "short phrase they said", "fixed": "corrected phrase", "why": "one plain sentence explaining the rule", "tag": "e.g. Tense, Grammar, Word Choice, Filler Word"}
  ],
  "fillerWordCount": number of filler words like "um", "uh", "like" used,
  "scores": {"grammar": 0-100, "tense": 0-100, "vocabulary": 0-100, "clarity": 0-100, "natural": 0-100, "overall": 0-100}
}
List at most 6 of the most useful corrections. Be honest but kind in scoring.`;

    try {
        const response = await ai.models.generateContent({
            model: 'gemini-flash-lite-latest',
            contents: [
                {
                    role: 'user',
                    parts: [
                        { text: instruction },
                        { inlineData: { mimeType: mimeType || 'audio/webm', data: audioBase64 } },
                    ],
                },
            ],
        });

        const raw = response.text ?? '';
        const clean = raw.replace(/```json|```/g, '').trim();
        const parsed = JSON.parse(clean);

        const saved = await prisma.entry.create({
            data: {
                prompt: userPrompt || '',
                text: parsed.transcript,
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