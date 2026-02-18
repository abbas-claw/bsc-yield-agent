import { NextResponse } from 'next/server';
import { StrategyEngine } from '@/lib/engine/strategy';
import { getWallet } from '@/lib/provider';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const address = searchParams.get('address');

    const wallet = getWallet();
    const userAddress = address || wallet?.address;

    if (!userAddress) {
      return NextResponse.json(
        { success: false, error: 'No address provided and no wallet configured' },
        { status: 400 }
      );
    }

    const engine = new StrategyEngine();
    const portfolio = await engine.getPortfolio(userAddress);

    return NextResponse.json({
      success: true,
      data: portfolio,
      address: userAddress,
      timestamp: Date.now(),
    });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: (error as Error).message },
      { status: 500 }
    );
  }
}
