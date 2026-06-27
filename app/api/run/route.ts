import { NextRequest, NextResponse } from 'next/server';

const OPENROUTER_API_URL = 'https://openrouter.ai/api/v1/chat/completions';

export async function POST(req: NextRequest) {
  try {
    const { code, inputs, conversation } = await req.json();

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

    // Build conversation messages
    const messages: { role: string; content: string }[] = [
      {
        role: 'system',
        content: 'You are a C# compiler and runtime. You execute C# code step by step. You MUST show ONLY the output from the current step forward. NEVER repeat output from previous turns. Show prompts and input values together. Compute all arithmetic correctly. If you reach a new Console.ReadLine() and no more inputs are provided, show the prompt and stop.'
      }
    ];

    // Add previous conversation if it exists
    if (conversation && Array.isArray(conversation) && conversation.length > 0) {
      messages.push(...conversation);
    }

    // Build the current user message
    const inputsList = inputs && inputs.length > 0
      ? inputs.map((v: string, i: number) => `${i + 1}. ${v}`).join('\n')
      : 'NONE';

    const userMessage = `Execute this C# code with these inputs (in order): ${inputsList}

CODE:
${code}

IMPORTANT: Show ONLY the output from where the PREVIOUS turn left off. If this is the first turn, show output from the start until the FIRST Console.ReadLine() prompt. If this is a continuation, show ONLY what happens AFTER the last input was provided. NEVER repeat output from previous turns.`;

    messages.push({ role: 'user', content: userMessage });

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
        messages,
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

    // Clean up
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
    const lines = cleanOutput.split('\n');
    const lastLine = lines[lines.length - 1].trim();
    const endsWithPrompt = lastLine.endsWith(':') && /enter|input|type|give|write|choose|select|read|provide|specify/i.test(lastLine.toLowerCase());

    // Also check if the code has more ReadLine than inputs
    const readLineMatches = code.match(/Console\.ReadLine\(\)/g);
    const totalReadLines = readLineMatches ? readLineMatches.length : 0;
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
