import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';

export function StatCard({ label, value, unit, hint, status, testid, className }) {
    const statusColor =
        status === 'good'
            ? 'text-[hsl(var(--telemetry-good))]'
            : status === 'warn'
              ? 'text-[hsl(var(--telemetry-warn))]'
              : status === 'bad'
                ? 'text-[hsl(var(--telemetry-bad))]'
                : 'text-foreground';
    return (
        <Card className={cn('bg-card/60 border-border/80', className)}>
            <CardHeader className="pb-2">
                <CardTitle className="text-xs font-semibold tracking-wide uppercase text-muted-foreground">
                    {label}
                </CardTitle>
            </CardHeader>
            <CardContent>
                <div className="flex items-baseline gap-2">
                    <div
                        className={cn('font-mono text-3xl font-semibold tabular-nums leading-none', statusColor)}
                        data-testid={testid}
                    >
                        {value ?? '—'}
                    </div>
                    {unit && <div className="font-mono text-xs text-muted-foreground">{unit}</div>}
                </div>
                {hint && <div className="mt-2 text-[11px] text-muted-foreground">{hint}</div>}
            </CardContent>
        </Card>
    );
}
