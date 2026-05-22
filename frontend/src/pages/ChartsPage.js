import React, { useEffect, useMemo, useRef, useState } from 'react';
import { toast } from 'sonner';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { Download, FileImage, FileText, Plus, X, Loader2, CalendarRange } from 'lucide-react';
import { toPng } from 'html-to-image';
import { jsPDF } from 'jspdf';
import { PageHeader } from '@/components/PageHeader';
import { useDevice } from '@/context/DeviceContext';
import { useI18n } from '@/context/I18nContext';
import { getLogHistory } from '@/lib/api';

const RANGE_OPTIONS = ['all', '1h', '6h', '24h', '7d', 'custom'];

function filterByRange(history, range, customStart, customEnd) {
    if (!history?.length) return [];
    if (range === 'all') return history;
    const now = Date.now();
    const cutoffs = { '1h': 3600e3, '6h': 6 * 3600e3, '24h': 24 * 3600e3, '7d': 7 * 24 * 3600e3 };
    if (cutoffs[range]) {
        const cutoff = now - cutoffs[range];
        return history.filter((h) => new Date(h.ts).getTime() >= cutoff);
    }
    if (range === 'custom' && (customStart || customEnd)) {
        const start = customStart ? new Date(customStart).getTime() : -Infinity;
        const end = customEnd ? new Date(customEnd).getTime() : Infinity;
        return history.filter((h) => {
            const t = new Date(h.ts).getTime();
            return t >= start && t <= end;
        });
    }
    return history;
}

const NIGHT_COLORS = [
    'hsl(var(--chart-1))',
    'hsl(var(--chart-3))',
    'hsl(var(--chart-5))',
    'hsl(var(--chart-2))',
];

export default function ChartsPage() {
    const { t } = useI18n();
    const { history } = useDevice();
    const [series, setSeries] = useState(['mpsas', 'temperature']);
    const [range, setRange] = useState('all');
    const [customStart, setCustomStart] = useState('');
    const [customEnd, setCustomEnd] = useState('');
    const [nights, setNights] = useState([]); // array of {date, samples, loading, error}
    const [newNight, setNewNight] = useState('');
    const [exporting, setExporting] = useState(false);
    const chartRef = useRef(null);

    const live = useMemo(() => filterByRange(history, range, customStart, customEnd), [history, range, customStart, customEnd]);
    const stats = useMemo(() => computeStats(live), [live]);

    // Build a merged dataset for the chart. Each row has a `ts` and named keys:
    //   - mpsas, temperature, frequency  (live)
    //   - night_<date>_mpsas             (per comparison night)
    // Since multi-night comparisons usually represent DIFFERENT days, we keep
    // them on their own time axis (relative seconds of day) for readability.
    // For simplicity here we render them on separate ResponsiveContainer charts.

    const addNight = async () => {
        if (!newNight) return;
        if (nights.some((n) => n.date === newNight)) {
            toast.error('Already added');
            return;
        }
        const next = { date: newNight, samples: [], loading: true, error: null, color: NIGHT_COLORS[nights.length % NIGHT_COLORS.length] };
        setNights((prev) => [...prev, next]);
        try {
            const r = await getLogHistory({ date: newNight });
            setNights((prev) => prev.map((n) => n.date === newNight ? { ...n, samples: r.samples || [], loading: false } : n));
            if (!r.samples?.length) toast.error(t('charts.noHistoricalData'));
        } catch (e) {
            setNights((prev) => prev.map((n) => n.date === newNight ? { ...n, error: 'failed', loading: false } : n));
            toast.error(t('charts.noHistoricalData'));
        }
        setNewNight('');
    };

    const removeNight = (date) => {
        setNights((prev) => prev.filter((n) => n.date !== date));
    };

    const exportPng = async () => {
        if (!chartRef.current) return;
        setExporting(true);
        try {
            const dataUrl = await toPng(chartRef.current, { backgroundColor: '#0a0e17', pixelRatio: 2 });
            const link = document.createElement('a');
            link.download = `udm-chart-${Date.now()}.png`;
            link.href = dataUrl;
            link.click();
            toast.success(t('charts.exportSuccess'));
        } catch (e) {
            toast.error(t('charts.exportFailed'));
        } finally {
            setExporting(false);
        }
    };

    const exportPdf = async () => {
        if (!chartRef.current) return;
        setExporting(true);
        try {
            const dataUrl = await toPng(chartRef.current, { backgroundColor: '#0a0e17', pixelRatio: 2 });
            const pdf = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
            const pageW = pdf.internal.pageSize.getWidth();
            const pageH = pdf.internal.pageSize.getHeight();
            const img = new Image();
            img.src = dataUrl;
            await new Promise((res) => { img.onload = res; });
            const ratio = img.height / img.width;
            const w = pageW - 20;
            const h = w * ratio;
            pdf.setFontSize(14);
            pdf.text('UDM Fork — Sky Quality Meter Chart', 10, 12);
            pdf.setFontSize(9);
            pdf.text(`Exported: ${new Date().toLocaleString()}`, 10, 18);
            pdf.addImage(dataUrl, 'PNG', 10, 24, w, Math.min(h, pageH - 30));
            pdf.save(`udm-chart-${Date.now()}.pdf`);
            toast.success(t('charts.exportSuccess'));
        } catch (e) {
            toast.error(t('charts.exportFailed'));
        } finally {
            setExporting(false);
        }
    };

    return (
        <div>
            <PageHeader
                title={t('charts.title')}
                description={t('charts.description')}
                actions={
                    <div className="flex items-center gap-2 flex-wrap">
                        <ToggleGroup type="multiple" value={series} onValueChange={setSeries}>
                            <ToggleGroupItem value="mpsas" data-testid="series-toggle-mpsas">{t('charts.mpsas')}</ToggleGroupItem>
                            <ToggleGroupItem value="temperature" data-testid="series-toggle-temperature">{t('charts.temperature')}</ToggleGroupItem>
                            <ToggleGroupItem value="frequency" data-testid="series-toggle-frequency">{t('charts.frequency')}</ToggleGroupItem>
                        </ToggleGroup>
                        <Button variant="secondary" size="sm" onClick={exportPng} disabled={exporting} data-testid="chart-export-png">
                            {exporting ? <Loader2 className="size-3.5 mr-2 animate-spin" /> : <FileImage className="size-3.5 mr-2" />}
                            {t('charts.exportPng')}
                        </Button>
                        <Button variant="secondary" size="sm" onClick={exportPdf} disabled={exporting} data-testid="chart-export-pdf">
                            {exporting ? <Loader2 className="size-3.5 mr-2 animate-spin" /> : <FileText className="size-3.5 mr-2" />}
                            {t('charts.exportPdf')}
                        </Button>
                    </div>
                }
            />

            {/* Range selector */}
            <Card className="bg-card/60 mb-4">
                <CardContent className="py-4">
                    <div className="flex items-center gap-3 flex-wrap">
                        <div className="flex items-center gap-2">
                            <CalendarRange className="size-4 text-primary" />
                            <span className="text-xs font-medium">{t('charts.timeRange')}</span>
                        </div>
                        <Select value={range} onValueChange={setRange}>
                            <SelectTrigger className="w-[180px]" data-testid="chart-range-select">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                {RANGE_OPTIONS.map((opt) => (
                                    <SelectItem key={opt} value={opt}>
                                        {opt === 'all' && t('charts.allData')}
                                        {opt === '1h' && t('charts.last1h')}
                                        {opt === '6h' && t('charts.last6h')}
                                        {opt === '24h' && t('charts.last24h')}
                                        {opt === '7d' && t('charts.last7d')}
                                        {opt === 'custom' && t('charts.customRange')}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                        {range === 'custom' && (
                            <div className="flex items-center gap-2 flex-wrap">
                                <Input type="datetime-local" value={customStart} onChange={(e) => setCustomStart(e.target.value)} className="w-[200px]" data-testid="chart-range-start" />
                                <span className="text-muted-foreground">→</span>
                                <Input type="datetime-local" value={customEnd} onChange={(e) => setCustomEnd(e.target.value)} className="w-[200px]" data-testid="chart-range-end" />
                            </div>
                        )}
                        <div className="ml-auto text-xs text-muted-foreground">
                            {live.length} samples
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Main live chart */}
            <div ref={chartRef} className="space-y-4">
                <Card className="bg-card/60">
                    <CardHeader>
                        <CardTitle>{t('charts.recentTelemetry')}</CardTitle>
                        <CardDescription>{t('charts.recentTelemetryDesc', { count: live.length })}</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="h-[420px]">
                            <ResponsiveContainer width="100%" height="100%">
                                <LineChart data={live} margin={{ left: 0, right: 12, top: 8, bottom: 0 }}>
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
                                    <YAxis yAxisId="left" stroke="hsl(var(--muted-foreground))" tickLine={false} axisLine={false} width={48} style={{ fontSize: 10 }} />
                                    <YAxis yAxisId="right" orientation="right" stroke="hsl(var(--muted-foreground))" tickLine={false} axisLine={false} width={48} style={{ fontSize: 10 }} />
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
                            <StatBlock label={t('charts.mpsasStats')} value={stats.mpsas} />
                            <StatBlock label={t('charts.tempStats')} value={stats.temperature} />
                            <StatBlock label={t('charts.freqStats')} value={stats.frequency} />
                        </div>
                    </CardContent>
                </Card>

                {/* Multi-night comparison */}
                <Card className="bg-card/60">
                    <CardHeader>
                        <CardTitle className="text-base">{t('charts.compareNights')}</CardTitle>
                        <CardDescription className="text-xs">
                            {t('charts.selectDate')} (YYYY-MM-DD)
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-3">
                        <div className="flex items-center gap-2 flex-wrap">
                            <Input
                                type="date"
                                value={newNight}
                                onChange={(e) => setNewNight(e.target.value)}
                                className="w-[200px]"
                                data-testid="chart-night-date-input"
                            />
                            <Button onClick={addNight} size="sm" disabled={!newNight} data-testid="chart-add-night">
                                <Plus className="size-3.5 mr-1.5" /> {t('charts.addNight')}
                            </Button>
                            <div className="flex items-center gap-1 flex-wrap">
                                {nights.map((n) => (
                                    <Badge
                                        key={n.date}
                                        variant="outline"
                                        className="gap-1 font-mono cursor-pointer"
                                        style={{ borderColor: n.color, color: n.color }}
                                        onClick={() => removeNight(n.date)}
                                        data-testid={`chart-night-${n.date}`}
                                    >
                                        {n.loading && <Loader2 className="size-3 animate-spin" />}
                                        {n.date}
                                        <X className="size-3" />
                                    </Badge>
                                ))}
                            </div>
                        </div>
                        {nights.length > 0 && (
                            <div className="h-[320px]">
                                <ResponsiveContainer width="100%" height="100%">
                                    <LineChart margin={{ left: 0, right: 12, top: 8, bottom: 0 }}>
                                        <CartesianGrid stroke="hsl(var(--border) / 0.55)" strokeDasharray="3 6" />
                                        <XAxis
                                            type="number"
                                            dataKey="hour"
                                            domain={[0, 24]}
                                            ticks={[0, 3, 6, 9, 12, 15, 18, 21, 24]}
                                            tickFormatter={(v) => `${String(Math.floor(v)).padStart(2, '0')}:00`}
                                            stroke="hsl(var(--muted-foreground))"
                                            tickLine={false}
                                            axisLine={false}
                                            style={{ fontSize: 10 }}
                                        />
                                        <YAxis
                                            domain={[(dMin) => Math.floor(dMin - 0.5), (dMax) => Math.ceil(dMax + 0.5)]}
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
                                        />
                                        <Legend />
                                        {nights.map((n) => {
                                            const data = (n.samples || []).map((s) => {
                                                const d = new Date(s.ts);
                                                const hour = isNaN(d.getTime()) ? null : (d.getHours() + d.getMinutes() / 60);
                                                return { hour, mpsas: s.mpsas };
                                            }).filter((p) => p.hour != null && p.mpsas != null);
                                            return (
                                                <Line
                                                    key={n.date}
                                                    name={n.date}
                                                    data={data}
                                                    dataKey="mpsas"
                                                    stroke={n.color}
                                                    strokeWidth={2}
                                                    dot={false}
                                                    isAnimationActive={false}
                                                />
                                            );
                                        })}
                                    </LineChart>
                                </ResponsiveContainer>
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>
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
