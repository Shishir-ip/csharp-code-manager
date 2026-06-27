import { NextRequest, NextResponse } from 'next/server';

const OPENROUTER_API_URL = 'https://openrouter.ai/api/v1/chat/completions';

export async function POST(req: NextRequest) {
  try {
    const { code, inputs } = await req.json();

    const inputsList = inputs && inputs.length > 0 
      ? `The user will provide these inputs for Console.ReadLine() calls IN ORDER:\n${inputs.join('\n')}\n\n`
      : 'The user has not provided any inputs yet. Show the program output including all input prompts.\n\n';

    const userPrompt = `${inputsList}Execute this C# code and show the COMPLETE terminal output from start to finish. Show EVERY prompt (Console.Write/WriteLine) and EVERY result. When Console.ReadLine() is called, show the prompt and the input value on the next line.

C# Code:
${code}

Show the FULL output. No explanations. No markdown. Just raw terminal text.`;

    const response = await fetch(OPENROUTER_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.OPENROUTER_API_KEY}`,
        'HTTP-Referer': process.env.NEXT_PUBLIC_SITE_URL || 'https://csharp-code-manager.vercel.app',
        'X-Title': 'C# Lab Manager',
      },
      body: JSON.stringify({
        model: 'openrouter/auto',
        messages: [
          { role: 'system', content: 'You are a C# compiler. Show complete terminal output with all prompts and input values. Raw text only.' },
          { role: 'user', content: userPrompt }
        ],
        max_tokens: 1500,
        temperature: 0.05,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      return NextResponse.json({ 
        error: errorData.error?.message || `API Error ${response.status}`, 
        output: '' 
      }, { status: 500 });
    }

    const data = await response.json();
    let aiOutput = data.choices?.[0]?.message?.content || '';
    
    aiOutput = aiOutput
      .replace(/^```[\s\S]*?\n/, '')
      .replace(/\n```$/, '')
      .trim();

    return NextResponse.json({ output: aiOutput, error: '' });
  } catch (err: any) {
    return NextResponse.json(
      { error: 'Execution failed: ' + err.message, output: '' },
      { status: 500 }
    );
  }
}
