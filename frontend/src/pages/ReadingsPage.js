import React, { useState } from 'react';
import { toast } from 'sonner';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Loader2, Gauge, Thermometer, Activity, Timer, RefreshCw } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { PageHeader } from '@/components/PageHeader';
import { StatCard } from '@/components/StatCard';
import { WeatherCard, GpsCard } from '@/components/SQMProCards';
import { getDeviceReading } from '@/lib/api';
import { useDevice } from '@/context/DeviceContext';
import { useI18n } from '@/context/I18nContext';

function mpsasStatus(v) {
    if (v == null) return undefined;
    if (v >= 21.0) return 'good'; // pristine
    if (v >= 19.5) return 'good';
    if (v >= 18) return 'warn';
    return 'bad';
}

export default function ReadingsPage() {
    const { t } = useI18n();
    const { status, latestReading, smoothedReading, history, clearHistory } = useDevice();
    const [manualLoading, setManualLoading] = useState(false);
    const [averaged, setAveraged] = useState(true);
    const [manualResp, setManualResp] = useState(null);

    const onRead = async () => {
        if (!status.connected) return toast.error(t('readings.toastConnectFirst'));
        setManualLoading(true);
        try {
            const r = await getDeviceReading(averaged);
            setManualResp(r);
            toast.success(t('readings.toastRetrieved'));
        } catch (e) {
            toast.error(e?.response?.data?.detail || t('readings.toastReadFailed'));
        } finally {
            setManualLoading(false);
        }
    };

    // Display uses the smoothed reading so the stat cards stop jumping; fall
    // back to the raw latest sample for non-smoothed metrics.
    const r = smoothedReading ?? null;
    const raw = latestReading;

    return (
        <div>
            <PageHeader
                title={t('readings.title')}
                description={t('readings.description')}
                actions={
                    <div className="flex items-center gap-3">
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                            <Switch checked={averaged} onCheckedChange={setAveraged} data-testid="averaged-toggle" />
                            <span>{averaged ? t('readings.averaged') : t('readings.unaveraged')}</span>
                        </div>
                        <Button onClick={onRead} variant="secondary" disabled={!status.connected} data-testid="manual-read-button">
                            {manualLoading ? (
                                <Loader2 className="size-4 mr-2 animate-spin" />
                            ) : (
                                <RefreshCw className="size-4 mr-2" />
                            )}
                            {t('readings.readNow')}
                        </Button>
                    </div>
                }
            />

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                <StatCard
                    label={t('readings.skyBrightness')}
                    value={r?.mpsas != null ? r.mpsas.toFixed(2) : '—'}
                    unit="mag/arcsec²"
                    status={mpsasStatus(r?.mpsas)}
                    hint={t('readings.skyHint')}
                    testid="live-mpsas-value"
                />
                <StatCard
                    label={t('readings.temperature')}
                    value={r?.temperature != null ? r.temperature.toFixed(1) : (raw?.temperature_c != null ? raw.temperature_c.toFixed(1) : '—')}
                    unit="°C"
                    testid="live-temp-value"
                />
                <StatCard
                    label={t('readings.frequency')}
                    value={r?.frequency != null ? r.frequency.toFixed(0) : (raw?.frequency_hz != null ? raw.frequency_hz.toFixed(0) : '—')}
                    unit="Hz"
                    testid="live-freq-value"
                />
                <StatCard
                    label={t('readings.counts')}
                    value={r?.counts != null ? Math.round(r.counts).toLocaleString() : (raw?.counts != null ? raw.counts.toLocaleString() : '—')}
                    unit={t('readings.period')}
                    testid="live-counts-value"
                />
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
                <Card className="xl:col-span-8 bg-card/60">
                    <CardHeader className="flex flex-row items-center justify-between">
                        <div>
                            <CardTitle>{t('readings.realtimeMpsas')}</CardTitle>
                            <CardDescription>{t('readings.realtimeDesc', { count: history.length })}</CardDescription>
                        </div>
                        <Button size="sm" variant="ghost" onClick={clearHistory} data-testid="clear-history-button">{t('common.clear')}</Button>
                    </CardHeader>
                    <CardContent>
                        <div className="h-64">
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
                                        domain={[(dataMin) => Math.floor(dataMin - 0.5), (dataMax) => Math.ceil(dataMax + 0.5)]}
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
                                    <Line type="monotone" dataKey="mpsas" stroke="hsl(var(--chart-1))" strokeWidth={2} dot={false} isAnimationActive={false} />
                                </LineChart>
                            </ResponsiveContainer>
                        </div>
                    </CardContent>
                </Card>

                <Card className="xl:col-span-4 bg-card/60">
                    <CardHeader>
                        <CardTitle>{t('readings.manualReading')}</CardTitle>
                        <CardDescription>{t('readings.manualDesc')}</CardDescription>
                    </CardHeader>
                    <CardContent>
                        {manualResp ? (
                            <div className="space-y-2 text-sm">
                                <Row icon={Gauge} label={t('readings.mpsasLabel')} value={manualResp.mpsas?.toFixed(3)} />
                                <Row icon={Activity} label={t('readings.freqHz')} value={manualResp.frequency_hz} />
                                <Row icon={Timer} label={t('readings.periodS')} value={manualResp.period_s} />
                                <Row icon={Activity} label={t('readings.countsLabel')} value={manualResp.counts} />
                                <Row icon={Thermometer} label={t('readings.tempC')} value={manualResp.temperature_c?.toFixed(1)} />
                                <div className="pt-2">
                                    <div className="text-[11px] uppercase tracking-wide text-muted-foreground">{t('common.raw')}</div>
                                    <pre className="mt-1 font-mono text-xs whitespace-pre-wrap break-words bg-secondary/50 rounded p-2 border border-border">
                                        {manualResp.raw}
                                    </pre>
                                </div>
                            </div>
                        ) : (
                            <p className="text-sm text-muted-foreground">{t('readings.noManual')}</p>
                        )}
                    </CardContent>
                </Card>
            </div>

            <div className="grid grid-cols-1 gap-6 mt-6">
                <WeatherCard connected={status.connected} />
                <GpsCard connected={status.connected} />
            </div>
        </div>
    );
}

function Row({ icon: Icon, label, value }) {
    return (
        <div className="flex items-center justify-between border-b border-border/60 py-1.5">
            <div className="flex items-center gap-2 text-muted-foreground">
                <Icon className="size-3.5" />
                <span className="text-xs">{label}</span>
            </div>
            <span className="font-mono">{value ?? '—'}</span>
        </div>
    );
}
