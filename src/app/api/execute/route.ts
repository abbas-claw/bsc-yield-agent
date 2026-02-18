import { NextResponse } from 'next/server';
import { Executor } from '@/lib/engine/executor';
import { TransactionRequest } from '@/lib/types';
import { getWallet } from '@/lib/provider';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  try {
    const wallet = getWallet();
    if (!wallet) {
      return NextResponse.json(
        { success: false, error: 'No wallet configured. Set PRIVATE_KEY env variable.' },
        { status: 400 }
      );
    }

    const body = await request.json();
    const { action, protocol, token, amount } = body as TransactionRequest;

    if (!action || !protocol || !token || !amount) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields: action, protocol, token, amount' },
        { status: 400 }
      );
    }

    // Validate action
    const validActions = ['supply', 'withdraw', 'borrow', 'repay', 'claim'];
    if (!validActions.includes(action)) {
      return NextResponse.json(
        { success: false, error: `Invalid action. Must be one of: ${validActions.join(', ')}` },
        { status: 400 }
      );
    }

    const executor = new Executor();
    const result = await executor.executeAction({ action, protocol, token, amount });

    return NextResponse.json({
      success: result.status === 'confirmed',
      data: result,
      timestamp: Date.now(),
    });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: (error as Error).message },
      { status: 500 }
    );
  }
}

// Get action log
export async function GET() {
  try {
    const executor = new Executor();
    const log = executor.getActionLog();

    return NextResponse.json({
      success: true,
      data: log,
      timestamp: Date.now(),
    });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: (error as Error).message },
      { status: 500 }
    );
  }
}
