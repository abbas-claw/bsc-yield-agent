import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function POST() {
  return NextResponse.json(
    { success: false, error: 'Execution disabled. This deployment is read-only.' },
    { status: 403 }
  );
}

export async function GET() {
  return NextResponse.json({
    success: true,
    data: [],
    message: 'Execution disabled. Read-only mode.',
    timestamp: Date.now(),
  });
}
