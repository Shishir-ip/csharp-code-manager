import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  try {
    let { code, stdin } = await req.json();

    // Auto-add using System if not present
    if (!code.includes('using System')) {
      code = 'using System;\n\n' + code;
    }

    const response = await fetch('https://api.onlinecompiler.io/api/run-code-sync/', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': process.env.ONLINE_COMPILER_API_KEY || '',
      },
      body: JSON.stringify({
        compiler: 'dotnet-csharp-9',
        code: code,
        input: stdin || '',
      }),
    });

    const data = await response.json();
    
    // Handle all possible response field names from OnlineCompiler.io
    let output = '';
    let error = '';
    
    if (data.output) output = data.output;
    else if (data.stdout) output = data.stdout;
    else if (data.result) output = data.result;
    
    if (data.error) error = data.error;
    else if (data.stderr) error = data.stderr;
    else if (data.compile_output) error = data.compile_output;
    
    // If build succeeded but no output, show helpful message
    if (!output && !error) {
      output = `> Build succeeded but no output was produced.
> This usually means:
> 1. The program needs input (Console.ReadLine) but no input was provided
> 2. Try entering input in the "Program requires input" box above
> 3. Or switch to Simulation Mode for pre-defined output`;
    }
    
    return NextResponse.json({ output, error });
  } catch (err) {
    return NextResponse.json(
      { error: 'Execution failed. API may be unavailable.', output: '' },
      { status: 500 }
    );
  }
}
