import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET() {
  return NextResponse.json({
    success: true,
    data: {
      running: false,
      mode: 'read-only',
      message: 'Agent execution disabled. Dashboard is read-only.',
    },
    timestamp: Date.now(),
  });
}

export async function POST() {
  return NextResponse.json(
    { success: false, error: 'Agent control disabled. This deployment is read-only.' },
    { status: 403 }
  );
}
