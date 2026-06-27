import { NextRequest, NextResponse } from 'next/server';

const OPENROUTER_API_URL = 'https://openrouter.ai/api/v1/chat/completions';

export async function POST(req: NextRequest) {
  try {
    const { code } = await req.json();

    if (!code || typeof code !== 'string') {
      return NextResponse.json(
        { error: 'Code is required', output: '' },
        { status: 400 }
      );
    }

    if (!process.env.OPENROUTER_API_KEY) {
      return NextResponse.json(
        { error: 'OPENROUTER_API_KEY is not configured', output: '' },
        { status: 500 }
      );
    }

    const userPrompt = `You are a C# compiler runtime. Execute the following C# code and show the COMPLETE console output.

CRITICAL INSTRUCTION:
- Find EVERY Console.ReadLine() call in the code
- Replace the input value that would be entered at EACH ReadLine with the marker [AWAITING_INPUT]
- The marker must appear EXACTLY where the user would type their input
- If the prompt uses Console.Write (same line), put the marker on the same line
- If the prompt uses Console.WriteLine (next line), put the marker on the next line

Examples:
Console.Write("Enter number: "); int x = int.Parse(Console.ReadLine());
  -> Output: Enter number: [AWAITING_INPUT]

Console.WriteLine("Enter number:"); int x = int.Parse(Console.ReadLine());
  -> Output: Enter number:
  -> Output: [AWAITING_INPUT]

For loops, put [AWAITING_INPUT] for EVERY ReadLine inside the loop.

C# Code:
${code}

Show the FULL output with [AWAITING_INPUT] markers. NO actual input values. No explanations. No markdown code blocks. Raw text only.`;

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30000);

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
          { 
            role: 'system', 
            content: 'You are a C# compiler. Execute code and output raw console text. Replace every Console.ReadLine() input with [AWAITING_INPUT] marker. No markdown. No explanations.' 
          },
          { role: 'user', content: userPrompt }
        ],
        max_tokens: 2000,
        temperature: 0.05,
      }),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      const errorMsg = errorData.error?.message || `API Error ${response.status}`;
      
      if (errorMsg.includes('unavailable for free') || errorMsg.includes('No route found') || errorMsg.includes('rate limit')) {
        return NextResponse.json({ 
          error: 'All free AI models are currently busy. Please try again in a moment.', 
          output: '' 
        }, { status: 500 });
      }
      
      return NextResponse.json({ 
        error: errorMsg, 
        output: '' 
      }, { status: 500 });
    }

    const data = await response.json();
    let aiOutput = data.choices?.[0]?.message?.content || '';

    if (!aiOutput) {
      return NextResponse.json({ 
        output: '', 
        error: '' 
      });
    }

    // Remove markdown code blocks if present
    let cleanOutput = aiOutput;
    if (cleanOutput.startsWith('```')) {
      cleanOutput = cleanOutput.substring(cleanOutput.indexOf('\n') + 1);
    }
    const trimmedEnd = cleanOutput.trimEnd();
    if (trimmedEnd.endsWith('```')) {
      cleanOutput = cleanOutput.substring(0, cleanOutput.lastIndexOf('```'));
    }
    cleanOutput = cleanOutput.trim();

    // Remove common prefixes
    const prefixes = [
      /^Here is the (output|result):?\s*/i,
      /^The (program|code) (prints|outputs|produces):?\s*/i,
      /^Output:?\s*/i,
      /^Console output:?\s*/i,
      /^Terminal output:?\s*/i,
    ];
    for (const prefix of prefixes) {
      cleanOutput = cleanOutput.replace(prefix, '');
    }
    cleanOutput = cleanOutput.trim();

    return NextResponse.json({ output: cleanOutput, error: '' });
  } catch (err: any) {
    if (err.name === 'AbortError') {
      return NextResponse.json(
        { error: 'Request timed out. The AI model is taking too long.', output: '' },
        { status: 504 }
      );
    }
    return NextResponse.json(
      { error: 'Execution failed: ' + err.message, output: '' },
      { status: 500 }
    );
  }
}
