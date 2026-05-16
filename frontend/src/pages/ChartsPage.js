import React, { useState } from 'react';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { PageHeader } from '@/components/PageHeader';
import { useDevice } from '@/context/DeviceContext';

export default function ChartsPage() {
    const { history } = useDevice();
    const [series, setSeries] = useState(['mpsas', 'temperature']);

    const toggle = (key) => {
        setSeries((s) => (s.includes(key) ? s.filter((x) => x !== key) : [...s, key]));
    };

    const stats = computeStats(history);

    return (
        <div>
            <PageHeader
                title="Charts"
                description="Time-series view of recent telemetry collected from the SQM."
                actions={
                    <ToggleGroup type="multiple" value={series} onValueChange={setSeries}>
                        <ToggleGroupItem value="mpsas" data-testid="series-toggle-mpsas">mpsas</ToggleGroupItem>
                        <ToggleGroupItem value="temperature" data-testid="series-toggle-temperature">temperature</ToggleGroupItem>
                        <ToggleGroupItem value="frequency" data-testid="series-toggle-frequency">frequency</ToggleGroupItem>
                    </ToggleGroup>
                }
            />

            <Card className="bg-card/60">
                <CardHeader>
                    <CardTitle>Recent Telemetry</CardTitle>
                    <CardDescription>
                        {history.length} samples. Auto-updates while connected.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="h-[420px]">
                        <ResponsiveContainer width="100%" height="100%">
                            <LineChart data={history} margin={{ left: 0, right: 12, top: 8, bottom: 0 }}>
                                <CartesianGrid stroke="hsl(var(--border) / 0.55)" strokeDasharray="3 6" />
                                <XAxis
                                    dataKey="ts"
                                    tickFormatter={(v) => new Date(v).toLocaleTimeString().slice(0, 8)}
                                    stroke="hsl(var(--muted-foreground))"
                                    tickLine={false}
                                    axisLine={false}
                                    minTickGap={32}
                                    style={{ fontSize: 10 }}
                                />
                                <YAxis
                                    yAxisId="left"
                                    stroke="hsl(var(--muted-foreground))"
                                    tickLine={false}
                                    axisLine={false}
                                    width={48}
                                    style={{ fontSize: 10 }}
                                />
                                <YAxis
                                    yAxisId="right"
                                    orientation="right"
                                    stroke="hsl(var(--muted-foreground))"
                                    tickLine={false}
                                    axisLine={false}
                                    width={48}
                                    style={{ fontSize: 10 }}
                                />
                                <Tooltip
                                    contentStyle={{
                                        background: 'hsl(var(--card))',
                                        border: '1px solid hsl(var(--border))',
                                        borderRadius: 8,
                                        fontFamily: 'IBM Plex Mono',
                                        fontSize: 12,
                                    }}
                                    labelFormatter={(v) => new Date(v).toLocaleString()}
                                />
                                <Legend />
                                {series.includes('mpsas') && (
                                    <Line yAxisId="left" type="monotone" dataKey="mpsas" stroke="hsl(var(--chart-1))" strokeWidth={2} dot={false} isAnimationActive={false} />
                                )}
                                {series.includes('temperature') && (
                                    <Line yAxisId="right" type="monotone" dataKey="temperature" stroke="hsl(var(--chart-2))" strokeWidth={2} dot={false} isAnimationActive={false} />
                                )}
                                {series.includes('frequency') && (
                                    <Line yAxisId="right" type="monotone" dataKey="frequency" stroke="hsl(var(--chart-5))" strokeWidth={1.5} dot={false} isAnimationActive={false} />
                                )}
                            </LineChart>
                        </ResponsiveContainer>
                    </div>
                    <div className="mt-4 grid grid-cols-2 md:grid-cols-3 gap-3 text-xs" data-testid="chart-summary">
                        <StatBlock label="mpsas min/avg/max" value={stats.mpsas} />
                        <StatBlock label="temp min/avg/max (°C)" value={stats.temperature} />
                        <StatBlock label="freq min/avg/max (Hz)" value={stats.frequency} />
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}

function computeStats(history) {
    const out = { mpsas: '—', temperature: '—', frequency: '—' };
    if (!history.length) return out;
    for (const key of ['mpsas', 'temperature', 'frequency']) {
        const vals = history.map((h) => h[key]).filter((v) => typeof v === 'number');
        if (!vals.length) continue;
        const min = Math.min(...vals);
        const max = Math.max(...vals);
        const avg = vals.reduce((a, b) => a + b, 0) / vals.length;
        out[key] = `${fmt(min)} / ${fmt(avg)} / ${fmt(max)}`;
    }
    return out;
}
function fmt(n) {
    if (Math.abs(n) >= 1000) return n.toFixed(0);
    return n.toFixed(2);
}

function StatBlock({ label, value }) {
    return (
        <div className="rounded-lg border border-border p-3">
            <div className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</div>
            <div className="font-mono mt-0.5">{value}</div>
        </div>
    );
}
