import React, { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Loader2, Settings2, ShieldCheck, ShieldOff, RefreshCw } from 'lucide-react';
import { PageHeader } from '@/components/PageHeader';
import { calibrateDevice, getCalibrationInfo, sendRawCommand, setLoggingInterval } from '@/lib/api';
import { useDevice } from '@/context/DeviceContext';

export default function ConfigurationPage() {
    const { status } = useDevice();
    const [intervalSec, setIntervalSec] = useState(60);
    const [working, setWorking] = useState(false);
    const [cal, setCal] = useState(null);
    const [intervalResp, setIntervalResp] = useState('');

    const refreshCal = async () => {
        if (!status.connected) return;
        try {
            const c = await getCalibrationInfo();
            setCal(c);
        } catch (e) { /* ignore */ }
    };
    const readCurrentInterval = async () => {
        if (!status.connected) return;
        try {
            const r = await sendRawCommand('Ix');
            setIntervalResp(r.response || '');
        } catch (e) { /* ignore */ }
    };
    useEffect(() => {
        refreshCal();
        readCurrentInterval();
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
            const r = await calibrateDevice(action);
            toast.success(`Sent: ${action}`);
            console.log(r);
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
                title="Configuration &amp; Calibration"
                description="Adjust the device's internal logging interval and light/dark calibration registers."
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
                        <CardTitle>Calibration</CardTitle>
                        <CardDescription>
                            Light calibration requires the official reference light source. Use Disarm to cancel.
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-3">
                        <Button onClick={refreshCal} variant="secondary" size="sm" data-testid="refresh-cal-button">
                            <RefreshCw className="size-3.5 mr-2" /> Read calibration
                        </Button>
                        {cal && (
                            <pre className="font-mono text-xs bg-secondary/50 rounded p-2 border border-border whitespace-pre-wrap break-words">
                                {JSON.stringify(cal, null, 2)}
                            </pre>
                        )}
                        <div className="flex gap-2 pt-2">
                            <Button onClick={() => onCalibrate('arm_light')} disabled={working || !status.connected} data-testid="arm-cal-button">
                                <ShieldCheck className="size-4 mr-2" /> Arm Light Calibration
                            </Button>
                            <Button onClick={() => onCalibrate('disarm')} variant="secondary" disabled={working || !status.connected} data-testid="disarm-cal-button">
                                <ShieldOff className="size-4 mr-2" /> Disarm
                            </Button>
                        </div>
                        <p className="text-[11px] text-muted-foreground">
                            Calibration sends <span className="font-mono">zcalAx</span> / <span className="font-mono">zcalDx</span> to the device.
                        </p>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
