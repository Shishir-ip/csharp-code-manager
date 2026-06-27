import { NextRequest, NextResponse } from 'next/server';

const OPENROUTER_API_URL = 'https://openrouter.ai/api/v1/chat/completions';

export async function POST(req: NextRequest) {
  try {
    const { code, inputs } = await req.json();

    const inputsList = inputs && inputs.length > 0 
      ? inputs.join('\n')
      : 'None';

    const userPrompt = `You are a C# compiler. Execute this code with the provided inputs.

CRITICAL RULES:
1. Use inputs in this EXACT order for EVERY Console.ReadLine(): ${inputsList}
2. After using an input, cross it off and use the NEXT one for the NEXT ReadLine
3. Show ONLY output up to and including the NEXT Console.ReadLine() prompt
4. If all inputs are used up, show the complete remaining output
5. NEVER skip ReadLine calls - each one needs an input
6. NEVER generate fake inputs - only use the provided ones

C# Code:
${code}

Show output from start to the NEXT ReadLine (or to end if no more ReadLine). Raw text only.`;

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
            content: 'You are a C# compiler runtime. Execute code step by step. Each Console.ReadLine() consumes ONE input value. Stop after each ReadLine and wait. Show input values in output. Raw terminal text only.' 
          },
          { role: 'user', content: userPrompt }
        ],
        max_tokens: 1000,
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

    // Check if there's another ReadLine waiting (output ends with prompt)
    const lines = aiOutput.split('\n');
    const lastLine = lines[lines.length - 1].trim();
    const hasMoreInput = lastLine.endsWith(':') && /enter|input|type|give|write|choose|select/i.test(lastLine);

    return NextResponse.json({ output: aiOutput, error: '', hasMoreInput });
  } catch (err: any) {
    return NextResponse.json(
      { error: 'Execution failed: ' + err.message, output: '', hasMoreInput: false },
      { status: 500 }
    );
  }
}
