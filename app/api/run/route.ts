import { NextRequest, NextResponse } from 'next/server';

const OPENROUTER_API_URL = 'https://openrouter.ai/api/v1/chat/completions';

export async function POST(req: NextRequest) {
  try {
    const { code, inputs, step } = await req.json();

    let userPrompt = '';
    
    if (!inputs || inputs.length === 0) {
      // First call - no inputs yet
      userPrompt = `Execute this C# code. Run it step by step. Stop immediately when you reach the FIRST Console.ReadLine() call. Show ONLY the output BEFORE that ReadLine (including the prompt text like "Enter..."). Do NOT show what happens after ReadLine.

C# Code:
${code}

Respond with ONLY the raw console output up to (and including) the first input prompt. Nothing else.`;
    } else {
      // Subsequent calls - provide all inputs, ask to show them in output
      const inputsList = inputs.map((v: string, i: number) => `Input ${i + 1}: ${v}`).join('\n');
      
      userPrompt = `Continue executing this C# code. The user has ALREADY provided these inputs (show them in the output where ReadLine happens):
${inputsList}

Continue execution from where the last ReadLine left off. When you reach a ReadLine, show the prompt AND the input value on the SAME line or NEXT line (as a real terminal would). Then continue with calculations and results. Keep going until the NEXT ReadLine or until the program ends.

C# Code:
${code}

Respond with ONLY the raw console output from this point forward. Include input values in the output. Nothing else.`;
    }

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
            content: 'You are a C# compiler runtime. When showing output with ReadLine, ALWAYS show the input value that the user typed. For example: "Enter number: 12" or "Enter number:\\n12". Never leave the input blank. Output ONLY raw console text. No explanations.' 
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
    const aiOutput = data.choices?.[0]?.message?.content || '';
    
    // Clean output
    let cleanOutput = aiOutput
      .replace(/^```[\s\S]*?\n/, '')
      .replace(/\n```$/, '')
      .replace(/^Here is the output:?\s*/i, '')
      .replace(/^The program prints:?\s*/i, '')
      .replace(/^Output:?\s*/i, '')
      .replace(/^Console output:?\s*/i, '')
      .trim();

    // Detect if there's another prompt waiting
    const lines = cleanOutput.split('\n');
    const lastLine = lines[lines.length - 1].trim();
    const hasMoreInput = lastLine.endsWith(':') && /enter|input|type|give|write|choose|select/i.test(lastLine);

    return NextResponse.json({ 
      output: cleanOutput, 
      error: '',
      hasMoreInput 
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: 'Execution failed: ' + err.message, output: '', hasMoreInput: false },
      { status: 500 }
    );
  }
}
