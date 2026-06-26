import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  try {
    const { code, stdin } = await req.json();

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
    return NextResponse.json(data);
  } catch (error) {
    return NextResponse.json(
      { error: 'Execution failed. API may be unavailable.' },
      { status: 500 }
    );
  }
}