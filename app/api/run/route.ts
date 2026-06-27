import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  try {
    const { code, stdin, conversation } = await req.json();

    const systemPrompt = `You are a C# compiler and runtime environment. Your job is to execute C# code mentally and produce EXACT compiler-like output.

Rules:
1. Simulate running the provided C# code step by step
2. If user provides input values, use them for Console.ReadLine() calls in order
3. Output ONLY what the program would print to console - no explanations, no markdown, no extra text
4. Format output exactly like a real terminal - line by line as the program executes
5. If there are compile errors, show them in standard C# compiler format
6. If the code has infinite loops or hangs, detect and stop after reasonable steps
7. Show prompts (Console.Write/WriteLine) and then the results
8. NEVER add explanatory text like "Here is the output" or "The program prints"
9. NEVER use markdown formatting like \`\`\` or **bold**
10. Just raw terminal output as the C# program would produce it

Input values provided by user (use in order for Console.ReadLine()):
${stdin || 'None provided'}

Respond with ONLY the raw console output. No preamble. No postscript.`;

    const messages = [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: `Execute this C# code and show ONLY the console output:\n\n${code}` }
    ];

    if (conversation && conversation.length > 0) {
      conversation.forEach((msg: any) => {
        messages.push({ role: msg.role, content: msg.content });
      });
    }

    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.OPENROUTER_API_KEY}`,
        'HTTP-Referer': process.env.NEXT_PUBLIC_SITE_URL || 'https://csharp-code-manager.vercel.app',
        'X-Title': 'C# Lab Manager',
      },
      body: JSON.stringify({
        model: 'deepseek/deepseek-r1',
        messages,
        max_tokens: 2000,
        temperature: 0.1,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      if (response.status === 429) {
        return await fallbackRun(code, stdin, conversation);
      }
      return NextResponse.json(
        { error: errorData.error?.message || `API Error: ${response.status}` },
        { status: 500 }
      );
    }

    const data = await response.json();
    const aiOutput = data.choices?.[0]?.message?.content || '';
    
    let cleanOutput = aiOutput
      .replace(/^```[\s\S]*?\n/, '')
      .replace(/\n```$/, '')
      .replace(/^Here is the output:?\s*/i, '')
      .replace(/^The program prints:?\s*/i, '')
      .replace(/^Output:?\s*/i, '')
      .replace(/^Console output:?\s*/i, '')
      .trim();

    return NextResponse.json({ output: cleanOutput, error: '' });
  } catch (err: any) {
    return NextResponse.json(
      { error: 'Execution failed: ' + err.message },
      { status: 500 }
    );
  }
}

async function fallbackRun(code: string, stdin: string, conversation: any[]) {
  try {
    const systemPrompt = `You are a C# compiler. Execute the code and show ONLY raw console output. No explanations. No markdown.`;
    
    const messages = [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: `C# Code:\n${code}\n\nInputs: ${stdin || 'none'}` }
    ];

    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.OPENROUTER_API_KEY}`,
        'HTTP-Referer': process.env.NEXT_PUBLIC_SITE_URL || 'https://csharp-code-manager.vercel.app',
        'X-Title': 'C# Lab Manager',
      },
      body: JSON.stringify({
        model: 'qwen/qwen3-235b-a22b:free',
        messages,
        max_tokens: 2000,
        temperature: 0.1,
      }),
    });

    const data = await response.json();
    const aiOutput = data.choices?.[0]?.message?.content || '';
    
    let cleanOutput = aiOutput
      .replace(/^```[\s\S]*?\n/, '')
      .replace(/\n```$/, '')
      .trim();

    return NextResponse.json({ output: cleanOutput, error: '' });
  } catch (err: any) {
    return NextResponse.json(
      { error: 'Fallback also failed: ' + err.message },
      { status: 500 }
    );
  }
}
