import { NextResponse } from 'next/server';
import { AgentMonitor } from '@/lib/engine/monitor';

export const dynamic = 'force-dynamic';

const monitor = new AgentMonitor(false); // Start with manual execution

// GET agent status
export async function GET() {
  try {
    const status = monitor.getStatus();
    return NextResponse.json({
      success: true,
      data: status,
      timestamp: Date.now(),
    });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: (error as Error).message },
      { status: 500 }
    );
  }
}

// POST to control agent (start/stop/check/auto)
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { action, autoExecute } = body;

    switch (action) {
      case 'start':
        monitor.start();
        return NextResponse.json({ success: true, message: 'Agent started' });

      case 'stop':
        monitor.stop();
        return NextResponse.json({ success: true, message: 'Agent stopped' });

      case 'check':
        const status = await monitor.runCheck();
        return NextResponse.json({ success: true, data: status });

      case 'auto':
        // Toggle auto-execute
        const newMonitor = new AgentMonitor(autoExecute ?? true);
        return NextResponse.json({
          success: true,
          message: `Auto-execute ${autoExecute ? 'enabled' : 'disabled'}`,
        });

      default:
        return NextResponse.json(
          { success: false, error: 'Invalid action. Use: start, stop, check, auto' },
          { status: 400 }
        );
    }
  } catch (error) {
    return NextResponse.json(
      { success: false, error: (error as Error).message },
      { status: 500 }
    );
  }
}
