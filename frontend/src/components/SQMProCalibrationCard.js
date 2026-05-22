import React, { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Sparkles, RefreshCw, Save, RotateCcw, Loader2 } from 'lucide-react';
import { getSqmProConfig, setSqmProCalibration } from '@/lib/api';

/**
 * Calibration panel specific to the SQM Pro firmware
 * (https://github.com/TinQuen22Fr/SQM-Pro-ESP8266). Uses the firmware's
 * own zcal1/zcal2/zcal3 + zcale/zcald + A50/A51/A5d/A5e commands.
 * Auto-hides if the device doesn't answer the 'g' read-config command.
 */
export function SQMProCalibrationCard({ connected }) {
    const [cfg, setCfg] = useState(null);
    const [supported, setSupported] = useState(false);
    const [draft, setDraft] = useState({});
    const [busy, setBusy] = useState(false);

    const refresh = async () => {
        if (!connected) return;
        try {
            const c = await getSqmProConfig();
            if (c.sqm_cal_offset_mpsas == null && c.temp_cal_offset_c == null && c.oled_on == null) {
                setSupported(false);
                return;
            }
            setSupported(true);
            setCfg(c);
            setDraft({
                sqm_offset_mpsas: c.sqm_cal_offset_mpsas ?? 0,
                temp_offset_c: c.temp_cal_offset_c ?? 0,
                display_contrast: c.display_contrast ?? 128,
                auto_temp_cal: c.auto_temp_cal ?? false,
                oled_on: c.oled_on ?? true,
                auto_contrast: c.auto_contrast ?? true,
            });
        } catch (e) {
            setSupported(false);
        }
    };

    useEffect(() => {
        refresh();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [connected]);

    if (!connected || !supported) return null;

    const apply = async (extra = {}) => {
        setBusy(true);
        try {
            const body = { ...draft, ...extra };
            const r = await setSqmProCalibration(body);
            toast.success(`Wrote ${r.results.length} setting(s) to device`);
            await refresh();
        } catch (e) {
            toast.error(e?.response?.data?.detail || 'Failed');
        } finally {
            setBusy(false);
        }
    };

    const factoryReset = async () => {
        if (!window.confirm('Send factory reset (zcalDx) to the device?')) return;
        setBusy(true);
        try {
            await setSqmProCalibration({ factory_reset: true });
            toast.success('Factory reset sent');
            await refresh();
        } catch (e) {
            toast.error('Failed');
        } finally {
            setBusy(false);
        }
    };

    return (
        <Card className="bg-card/60">
            <CardHeader className="flex flex-row items-center justify-between">
                <div>
                    <CardTitle className="flex items-center gap-2">
                        <Sparkles className="size-4 text-primary" /> SQM Pro calibration
                    </CardTitle>
                    <CardDescription className="text-xs">
                        DIY firmware specific commands (zcal1 / zcal2 / zcal3 / A50…A5e).
                        Auto-detected from <span className="font-mono">g</span> read-config response.
                    </CardDescription>
                </div>
                <Button size="icon" variant="ghost" onClick={refresh} disabled={busy} data-testid="sqmpro-refresh-button">
                    <RefreshCw className={`size-3.5 ${busy ? 'animate-spin' : ''}`} />
                </Button>
            </CardHeader>
            <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    <Numeric
                        label="SQM cal. offset (mpsas) — zcal1"
                        value={draft.sqm_offset_mpsas}
                        onChange={(v) => setDraft((d) => ({ ...d, sqm_offset_mpsas: v }))}
                        testid="sqmpro-sqm-offset"
                        step="0.01"
                    />
                    <Numeric
                        label="Temperature offset (°C) — zcal2"
                        value={draft.temp_offset_c}
                        onChange={(v) => setDraft((d) => ({ ...d, temp_offset_c: v }))}
                        testid="sqmpro-temp-offset"
                        step="0.1"
                    />
                    <Numeric
                        label="Display contrast (0-255) — zcal3"
                        value={draft.display_contrast}
                        onChange={(v) => setDraft((d) => ({ ...d, display_contrast: v }))}
                        testid="sqmpro-contrast"
                        step="1"
                    />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-2">
                    <Toggle label="Auto temp. calibration (zcale/zcald)" value={draft.auto_temp_cal} onChange={(v) => setDraft((d) => ({ ...d, auto_temp_cal: v }))} testid="sqmpro-auto-tc" />
                    <Toggle label="OLED on (A51/A50)" value={draft.oled_on} onChange={(v) => setDraft((d) => ({ ...d, oled_on: v }))} testid="sqmpro-oled" />
                    <Toggle label="Auto-contrast (A5e/A5d)" value={draft.auto_contrast} onChange={(v) => setDraft((d) => ({ ...d, auto_contrast: v }))} testid="sqmpro-auto-contrast" />
                </div>

                <div className="flex gap-2 flex-wrap pt-2">
                    <Button onClick={() => apply()} disabled={busy} data-testid="sqmpro-apply-button">
                        {busy ? <Loader2 className="size-4 mr-2 animate-spin" /> : <Save className="size-4 mr-2" />}
                        Apply changes
                    </Button>
                    <Button onClick={factoryReset} variant="destructive" disabled={busy} data-testid="sqmpro-factory-reset-button">
                        <RotateCcw className="size-4 mr-2" /> Factory reset (zcalDx)
                    </Button>
                </div>

                {cfg && (
                    <pre className="font-mono text-[10px] bg-secondary/50 rounded p-2 border border-border whitespace-pre-wrap break-words text-muted-foreground">
                        Raw: {cfg.raw}
                    </pre>
                )}
            </CardContent>
        </Card>
    );
}

function Numeric({ label, value, onChange, testid, step }) {
    return (
        <div className="space-y-1">
            <label className="text-[11px] text-muted-foreground">{label}</label>
            <Input type="number" step={step || 'any'} value={value ?? ''} onChange={(e) => onChange(e.target.value === '' ? null : Number(e.target.value))} data-testid={testid} />
        </div>
    );
}

function Toggle({ label, value, onChange, testid }) {
    return (
        <div className="flex items-center justify-between gap-2 rounded-md border border-border px-3 py-2">
            <span className="text-xs">{label}</span>
            <Switch checked={!!value} onCheckedChange={onChange} data-testid={testid} />
        </div>
    );
}
