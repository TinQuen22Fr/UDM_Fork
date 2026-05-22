import React, { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Loader2, Settings2, ShieldCheck, ShieldOff, RefreshCw, Moon, Sun, Clock } from 'lucide-react';
import { PageHeader } from '@/components/PageHeader';
import {
    calibrateDevice,
    getCalibrationInfo,
    getDeviceClock,
    getDLSettings,
    sendRawCommand,
    setCalibrationValues,
    setLoggingInterval,
} from '@/lib/api';
import { useDevice } from '@/context/DeviceContext';

export default function ConfigurationPage() {
    const { status } = useDevice();
    const [intervalSec, setIntervalSec] = useState(60);
    const [working, setWorking] = useState(false);
    const [cal, setCal] = useState(null);
    const [intervalResp, setIntervalResp] = useState('');
    const [clockResp, setClockResp] = useState('');
    const [dlResp, setDlResp] = useState(null);

    // Manual cal setters
    const [lightOffset, setLightOffset] = useState('');
    const [lightTemp, setLightTemp] = useState('');
    const [darkPeriod, setDarkPeriod] = useState('');
    const [darkTemp, setDarkTemp] = useState('');

    const refreshCal = async () => {
        if (!status.connected) return;
        try {
            const c = await getCalibrationInfo();
            setCal(c);
            if (c.light_calibration_mpsas != null) setLightOffset(String(c.light_calibration_mpsas));
            if (c.light_calibration_temperature_c != null) setLightTemp(String(c.light_calibration_temperature_c));
            if (c.light_calibration_period_s != null) setDarkPeriod(String(c.light_calibration_period_s));
            if (c.dark_calibration_temperature_c != null) setDarkTemp(String(c.dark_calibration_temperature_c));
        } catch (e) { /* ignore */ }
    };
    const readCurrentInterval = async () => {
        if (!status.connected) return;
        try {
            const r = await sendRawCommand('Ix');
            setIntervalResp(r.response || '');
        } catch (e) { /* ignore */ }
    };
    const readClock = async () => {
        if (!status.connected) return;
        try {
            const r = await getDeviceClock();
            setClockResp(r.response || '');
            const d = await getDLSettings();
            setDlResp(d);
        } catch (e) { /* ignore */ }
    };
    useEffect(() => {
        refreshCal();
        readCurrentInterval();
        readClock();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [status.connected]);

    const onApplyInterval = async () => {
        if (!status.connected) return toast.error('Connect first');
        setWorking(true);
        try {
            const r = await setLoggingInterval(Number(intervalSec));
            toast.success('Interval applied on device');
            setIntervalResp(r.response || '');
        } catch (e) {
            toast.error(e?.response?.data?.detail || 'Failed');
        } finally {
            setWorking(false);
        }
    };

    const onCalibrate = async (action) => {
        if (!status.connected) return toast.error('Connect first');
        if (!window.confirm(`Send calibration command '${action}' to the device?`)) return;
        setWorking(true);
        try {
            await calibrateDevice(action);
            toast.success(`Sent: ${action}`);
            refreshCal();
        } catch (e) {
            toast.error(e?.response?.data?.detail || 'Failed');
        } finally {
            setWorking(false);
        }
    };

    const onWriteCalValues = async () => {
        if (!status.connected) return toast.error('Connect first');
        if (!window.confirm('Write these calibration values to the device permanent memory?')) return;
        setWorking(true);
        try {
            const body = {};
            if (lightOffset !== '') body.light_offset_mpsas = Number(lightOffset);
            if (lightTemp !== '') body.light_temperature_c = Number(lightTemp);
            if (darkPeriod !== '') body.dark_period_s = Number(darkPeriod);
            if (darkTemp !== '') body.dark_temperature_c = Number(darkTemp);
            if (!Object.keys(body).length) {
                toast.message('No values to write');
                return;
            }
            const r = await setCalibrationValues(body);
            toast.success(`Wrote ${r.results.length} value(s) to device`);
            refreshCal();
        } catch (e) {
            toast.error(e?.response?.data?.detail || 'Failed');
        } finally {
            setWorking(false);
        }
    };

    return (
        <div>
            <PageHeader
                title="Configuration & Calibration"
                description="Adjust the device's internal logging interval and light/dark calibration registers (zcal5/6/7/8, zcalAx/Bx/Dx)."
            />

            <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
                <Card className="xl:col-span-6 bg-card/60">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Settings2 className="size-4 text-primary" /> Logging interval
                        </CardTitle>
                        <CardDescription>
                            Persisted on the device (Unihedron <span className="font-mono">Lxxxxxxxxx</span> command).
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="space-y-1.5">
                            <label className="text-xs text-muted-foreground">Interval (seconds, 0–99999)</label>
                            <Input
                                type="number"
                                min={0}
                                max={99999}
                                value={intervalSec}
                                onChange={(e) => setIntervalSec(e.target.value)}
                                data-testid="device-interval-input"
                            />
                        </div>
                        <Button onClick={onApplyInterval} disabled={working || !status.connected} data-testid="apply-interval-button">
                            {working ? <Loader2 className="size-4 mr-2 animate-spin" /> : null}
                            Apply on device
                        </Button>
                        {intervalResp && (
                            <div>
                                <div className="text-[11px] uppercase tracking-wide text-muted-foreground">Device response</div>
                                <pre className="mt-1 font-mono text-xs bg-secondary/50 rounded p-2 border border-border whitespace-pre-wrap break-words">
                                    {intervalResp}
                                </pre>
                            </div>
                        )}
                    </CardContent>
                </Card>

                <Card className="xl:col-span-6 bg-card/60">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Clock className="size-4 text-primary" /> Datalogger (RTC) status
                        </CardTitle>
                        <CardDescription>
                            Reads on-device clock (<span className="font-mono">Lcx</span>) and trigger settings (<span className="font-mono">Lmx</span>, <span className="font-mono">LIx</span>). For SQM-LU-DL models.
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-3">
                        <Button onClick={readClock} variant="secondary" size="sm" disabled={!status.connected} data-testid="read-clock-button">
                            <RefreshCw className="size-3.5 mr-2" /> Read clock
                        </Button>
                        {clockResp && (
                            <pre className="font-mono text-xs bg-secondary/50 rounded p-2 border border-border whitespace-pre-wrap break-words">
                                {clockResp}
                            </pre>
                        )}
                        {dlResp && (
                            <pre className="font-mono text-xs bg-secondary/50 rounded p-2 border border-border whitespace-pre-wrap break-words" data-testid="dl-settings">
                                {JSON.stringify(dlResp, null, 2)}
                            </pre>
                        )}
                    </CardContent>
                </Card>

                <Card className="xl:col-span-7 bg-card/60">
                    <CardHeader>
                        <CardTitle>Calibration</CardTitle>
                        <CardDescription>
                            Arm light/dark calibration requires the official reference source (use Disarm to cancel). Direct setters write to the device's permanent memory.
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-3">
                        <div className="flex gap-2 flex-wrap">
                            <Button onClick={refreshCal} variant="secondary" size="sm" data-testid="refresh-cal-button">
                                <RefreshCw className="size-3.5 mr-2" /> Read calibration
                            </Button>
                            <Button onClick={() => onCalibrate('arm_light')} disabled={working || !status.connected} data-testid="arm-cal-button">
                                <Sun className="size-4 mr-2" /> Arm Light Cal (zcalAx)
                            </Button>
                            <Button onClick={() => onCalibrate('arm_dark')} disabled={working || !status.connected} data-testid="arm-dark-cal-button">
                                <Moon className="size-4 mr-2" /> Arm Dark Cal (zcalBx)
                            </Button>
                            <Button onClick={() => onCalibrate('disarm')} variant="destructive" disabled={working || !status.connected} data-testid="disarm-cal-button">
                                <ShieldOff className="size-4 mr-2" /> Disarm (zcalDx)
                            </Button>
                        </div>
                        {cal && (
                            <pre className="font-mono text-xs bg-secondary/50 rounded p-2 border border-border whitespace-pre-wrap break-words">
                                {JSON.stringify(cal, null, 2)}
                            </pre>
                        )}
                    </CardContent>
                </Card>

                <Card className="xl:col-span-5 bg-card/60">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <ShieldCheck className="size-4 text-primary" /> Manual calibration write
                        </CardTitle>
                        <CardDescription>
                            Write specific values to <span className="font-mono">zcal5/6/7/8</span>. Leave a field empty to skip.
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-3">
                        <Field label="Light cal offset (mpsas) - zcal5" value={lightOffset} onChange={setLightOffset} testid="cal-light-offset" />
                        <Field label="Light cal temperature (°C) - zcal6" value={lightTemp} onChange={setLightTemp} testid="cal-light-temp-set" />
                        <Field label="Dark cal period (s) - zcal7" value={darkPeriod} onChange={setDarkPeriod} testid="cal-dark-period" />
                        <Field label="Dark cal temperature (°C) - zcal8" value={darkTemp} onChange={setDarkTemp} testid="cal-dark-temp-set" />
                        <Button onClick={onWriteCalValues} variant="destructive" disabled={working || !status.connected} data-testid="write-cal-button">
                            {working ? <Loader2 className="size-4 mr-2 animate-spin" /> : null}
                            Write to device
                        </Button>
                    </CardContent>
                </Card>

                <div className="xl:col-span-12">
                    <SQMProCalibrationCard connected={status.connected} />
                </div>
            </div>
        </div>
    );
}

function Field({ label, value, onChange, testid }) {
    return (
        <div className="space-y-1">
            <label className="text-[11px] text-muted-foreground">{label}</label>
            <Input value={value} onChange={(e) => onChange(e.target.value)} data-testid={testid} type="number" step="any" />
        </div>
    );
}
