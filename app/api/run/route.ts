import { NextRequest, NextResponse } from 'next/server';

const OPENROUTER_API_URL = 'https://openrouter.ai/api/v1/chat/completions';

export async function POST(req: NextRequest) {
  try {
    const { code, stdin, conversation } = await req.json();

    const systemPrompt = `You are a C# compiler and runtime environment. Execute C# code and produce EXACT console output.

Rules:
1. Simulate the code execution step by step
2. Use provided input values for Console.ReadLine() calls in order
3. Output ONLY what the program prints - no explanations, no markdown
4. Show prompts and results exactly as they would appear in a terminal
5. If compile errors exist, show them in standard C# format
6. NEVER add text like "Here is the output" or "The program prints"
7. NEVER use markdown code blocks or formatting
8. Just raw terminal output line by line

Input values (use in order for Console.ReadLine()):
${stdin || 'None provided'}

Respond with ONLY the raw console output. Nothing else.`;

    const messages = [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: `Execute this C# code and show ONLY console output:\n\n${code}` }
    ];

    if (conversation && conversation.length > 0) {
      conversation.forEach((msg: any) => {
        messages.push({ role: msg.role, content: msg.content });
      });
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
        messages,
        max_tokens: 2000,
        temperature: 0.1,
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
    
    // Clean the output
    let cleanOutput = aiOutput
      .replace(/^```[\s\S]*?\n/, '')
      .replace(/\n```$/, '')
      .replace(/^Here is the output:?\s*/i, '')
      .replace(/^The program prints:?\s*/i, '')
      .replace(/^Output:?\s*/i, '')
      .replace(/^Console output:?\s*/i, '')
      .replace(/^Here's the result:?\s*/i, '')
      .trim();

    return NextResponse.json({ output: cleanOutput, error: '' });
  } catch (err: any) {
    return NextResponse.json(
      { error: 'Execution failed: ' + err.message, output: '' },
      { status: 500 }
    );
  }
}
