import { NextResponse } from 'next/server';
import { StrategyEngine } from '@/lib/engine/strategy';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const engine = new StrategyEngine();
    const rates = await engine.getAllRates();

    // Sort by supply APY descending
    rates.sort((a, b) => b.netSupplyAPY - a.netSupplyAPY);

    return NextResponse.json({
      success: true,
      data: rates,
      timestamp: Date.now(),
    });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: (error as Error).message },
      { status: 500 }
    );
  }
}
