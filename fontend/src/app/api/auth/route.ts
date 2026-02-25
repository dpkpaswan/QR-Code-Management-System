import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const { password } = await request.json();
    const adminPassword = process.env.ADMIN_PASSWORD;

    if (!adminPassword) {
      return NextResponse.json({ success: false, error: 'Server configuration error' }, { status: 500 });
    }

    if (password === adminPassword) {
      return NextResponse.json({
        success: true,
        token: Buffer.from(`admin:${Date.now()}`).toString('base64'),
      });
    }

    return NextResponse.json({ success: false, error: 'Incorrect password' }, { status: 401 });
  } catch {
    return NextResponse.json({ success: false, error: 'Server error' }, { status: 500 });
  }
}