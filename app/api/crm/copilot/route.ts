import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  const apiKey = process.env.OPENAI_API_KEY;

  if (!apiKey) {
    return NextResponse.json({ error: 'AI not configured' }, { status: 503 });
  }

  try {
    const body = await req.json();
    const lead = body?.lead || {};
    const transcript = Array.isArray(lead.transcript)
      ? lead.transcript.slice(-20)
      : [];

    const response = await fetch('https://api.openai.com/v1/responses', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: process.env.OPENAI_MODEL || 'gpt-5.6-luna',
        store: false,
        input: [
          {
            role: 'system',
            content:
              "You are Jon Rover CRM Copilot for a Jaguar Land Rover salesperson. Return only valid JSON with these keys: summary, score, temperature, next_best_action, draft_text, reasons. score must be 0-100. temperature must be cold, warm, or hot. Be commercially sharp but never manipulative. Never invent vehicle facts.",
          },
          {
            role: 'user',
            content: JSON.stringify({
              name: lead.name,
              phone: lead.phone,
              email: lead.email,
              status: lead.status,
              last_request: lead.last_request,
              budget_max: lead.budget_max,
              desired_models: lead.desired_models,
              desired_exterior: lead.desired_exterior,
              desired_interior: lead.desired_interior,
              timeframe: lead.timeframe,
              trade_in: lead.trade_in,
              notes: lead.notes,
              transcript,
            }),
          },
        ],
      }),
    });

    if (!response.ok) {
      return NextResponse.json({ error: 'AI analysis failed' }, { status: 502 });
    }

    const payload = await response.json();
    let text = '';

    if (typeof payload?.output_text === 'string') {
      text = payload.output_text;
    } else if (Array.isArray(payload?.output)) {
      for (const item of payload.output) {
        if (!Array.isArray(item?.content)) continue;
        for (const part of item.content) {
          if (part?.type === 'output_text' && typeof part?.text === 'string') {
            text += part.text;
          }
        }
      }
    }

    try {
      return NextResponse.json(JSON.parse(text || '{}'));
    } catch {
      return NextResponse.json({ error: 'AI response invalid' }, { status: 502 });
    }
  } catch {
    return NextResponse.json({ error: 'Unable to analyze lead' }, { status: 500 });
  }
}
