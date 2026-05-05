import OpenAI from 'openai';
import { NextRequest, NextResponse } from 'next/server';
import { BADER_SYSTEM_PROMPT, compilePrompt, type ThinkingMode } from '@/lib/baderPrompt';
import { evaluateResponse } from '@/lib/evaluator';

export const runtime = 'nodejs';

type Body = {
  message?: string;
  mode?: ThinkingMode;
};

function localFallback(message: string, mode: ThinkingMode) {
  const text = `KERNEL\nThe app shell is running, but live AI is disabled because OPENAI_API_KEY is not configured. Your message was received in ${mode} mode.\n\nCONSTRAINTS\n- A server route exists and can process requests.\n- A model call cannot happen without a valid API key.\n\nMECHANISM\nrequest -> API route validates payload -> environment check fails -> deterministic fallback response\n\nVISUAL / STRUCTURE\nBrowser -> /api/chat -> env check -> fallback\n\nARTIFACT\nAdd OPENAI_API_KEY and OPENAI_MODEL to .env.local or your deployment provider.\n\nEPISTEMIC STATUS\nKnown: The app route is reachable.\nBelieved: Your deployment will work once the key is added.\nSuspected: No live model key is configured.\nUnknown: Whether the model name is valid for your account.`;
  return { text, evaluation: evaluateResponse(text) };
}

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as Body;
    const message = body.message?.trim();
    const mode = body.mode ?? 'pure';

    if (!message) {
      return NextResponse.json({ error: 'Message is required.' }, { status: 400 });
    }

    if (!process.env.OPENAI_API_KEY) {
      const fallback = localFallback(message, mode);
      return NextResponse.json({ ...fallback, model: 'local-fallback' });
    }

    const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    const model = process.env.OPENAI_MODEL || 'gpt-4.1-mini';

    const response = await client.responses.create({
      model,
      instructions: BADER_SYSTEM_PROMPT,
      input: compilePrompt(message, mode)
    });

    const text = response.output_text || 'No text output returned by model.';
    const evaluation = evaluateResponse(text);

    return NextResponse.json({ text, evaluation, model });
  } catch (error) {
    const detail = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: 'Chat route failed.', detail }, { status: 500 });
  }
}
