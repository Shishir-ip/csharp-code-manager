import { NextRequest, NextResponse } from 'next/server';

const OPENROUTER_API_URL = 'https://openrouter.ai/api/v1/chat/completions';

export async function POST(req: NextRequest) {
  try {
    const { code, inputs } = await req.json();

    if (!code || typeof code !== 'string') {
      return NextResponse.json(
        { error: 'Code is required', output: '', hasMoreInput: false },
        { status: 400 }
      );
    }

    if (!process.env.OPENROUTER_API_KEY) {
      return NextResponse.json(
        { error: 'OPENROUTER_API_KEY is not configured', output: '', hasMoreInput: false },
        { status: 500 }
      );
    }

    // Count Console.ReadLine() calls in the code (approximate)
    const readLineMatches = code.match(/Console\.ReadLine\(\)/g);
    const totalReadLines = readLineMatches ? readLineMatches.length : 0;

    const inputsList = inputs && inputs.length > 0
      ? inputs.map((v: string, i: number) => `${i + 1}. ${v}`).join('\n')
      : 'NONE';

    const userPrompt = `You are a C# compiler. Execute this C# code EXACTLY.

INPUTS PROVIDED (use these for Console.ReadLine() in this EXACT order):
${inputsList}

EXECUTION RULES — FOLLOW STRICTLY:
1. Start execution from the FIRST line of the code
2. Use the provided input values for EVERY Console.ReadLine() call, in order
3. After using an input, SHOW it in the output next to the prompt (e.g., "Enter number: 12")
4. ACTUALLY COMPUTE all arithmetic, conditionals, and loops with the REAL input values
5. Double-check: 10 + 20 = 30, 10 - 20 = -10, 10 * 20 = 200, 10 / 20 = 0
6. Continue execution until the NEXT Console.ReadLine() OR until the program ends
7. If there's another Console.ReadLine() after the last used input, stop RIGHT AFTER showing that prompt
8. NEVER skip a ReadLine call
9. NEVER make up input values — only use the provided ones
10. If all inputs are used, show the COMPLETE remaining output until the program ends

C# Code:
${code}

Show ONLY the raw console output. No explanations. No markdown code blocks. No "Here is the output". Just raw terminal text.`;

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
            content: 'You are a C# compiler runtime. Execute code exactly with the provided inputs. Show all prompts and input values. Compute all arithmetic correctly. Stop at the next Console.ReadLine() if more inputs are needed. Raw terminal text only.'
          },
          { role: 'user', content: userPrompt }
        ],
        max_tokens: 1500,
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
          output: '',
          hasMoreInput: false
        }, { status: 500 });
      }

      return NextResponse.json({
        error: errorMsg,
        output: '',
        hasMoreInput: false
      }, { status: 500 });
    }

    const data = await response.json();
    let aiOutput = data.choices?.[0]?.message?.content || '';

    if (!aiOutput) {
      return NextResponse.json({
        output: '',
        error: '',
        hasMoreInput: false
      });
    }

    // Clean up markdown and prefixes
    let cleanOutput = aiOutput;

    // Remove markdown code blocks
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
      /^The result is:?\s*/i,
    ];
    for (const prefix of prefixes) {
      cleanOutput = cleanOutput.replace(prefix, '');
    }
    cleanOutput = cleanOutput.trim();

    // Detect if more input is needed
    // Method 1: Check if output ends with a prompt line
    const lines = cleanOutput.split('\n');
    const lastLine = lines[lines.length - 1].trim();
    const endsWithPrompt = lastLine.endsWith(':') && /enter|input|type|give|write|choose|select|read|provide|specify/i.test(lastLine.toLowerCase());

    // Method 2: Compare ReadLine count vs inputs provided
    const hasMoreInput = endsWithPrompt || (totalReadLines > (inputs?.length || 0));

    return NextResponse.json({ output: cleanOutput, error: '', hasMoreInput });
  } catch (err: any) {
    if (err.name === 'AbortError') {
      return NextResponse.json(
        { error: 'Request timed out. The AI model is taking too long.', output: '', hasMoreInput: false },
        { status: 504 }
      );
    }
    return NextResponse.json(
      { error: 'Execution failed: ' + err.message, output: '', hasMoreInput: false },
      { status: 500 }
    );
  }
}
