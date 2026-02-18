import { NextResponse } from 'next/server';
import { StrategyEngine } from '@/lib/engine/strategy';
import { getWallet } from '@/lib/provider';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const address = searchParams.get('address');

    const wallet = getWallet();
    const userAddress = address || wallet?.address || '';

    const engine = new StrategyEngine();
    const recommendations = await engine.generateRecommendations(userAddress);

    return NextResponse.json({
      success: true,
      data: recommendations,
      address: userAddress || 'none',
      timestamp: Date.now(),
    });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: (error as Error).message },
      { status: 500 }
    );
  }
}
