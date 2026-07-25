import { GoogleGenAI } from '@google/genai';
import { NextRequest, NextResponse } from 'next/server';

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

export async function POST(req: NextRequest) {
  const { text } = await req.json();
  if (!text) return NextResponse.json({ error: 'No text provided' }, { status: 400 });

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash-preview-tts',
      contents: [{ role: 'user', parts: [{ text }] }],
      config: {
        responseModalities: ['AUDIO'],
        speechConfig: {
          voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Kore' } },
        },
      },
    });

    const audioPart = response.candidates?.[0]?.content?.parts?.find((p: any) => p.inlineData);
    const base64 = audioPart?.inlineData?.data;
    if (!base64) throw new Error('No audio returned');

    return NextResponse.json({ audio: base64 });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: 'Could not generate audio' }, { status: 500 });
  }
}