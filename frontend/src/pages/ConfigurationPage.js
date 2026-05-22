import React, { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Loader2, Settings2, ShieldCheck, ShieldOff, RefreshCw, Moon, Sun, Clock } from 'lucide-react';
import { PageHeader } from '@/components/PageHeader';
import { SQMProCalibrationCard } from '@/components/SQMProCalibrationCard';
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
import { useI18n } from '@/context/I18nContext';

export default function ConfigurationPage() {
    const { t } = useI18n();
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
        if (!status.connected) return toast.error(t('configuration.toastConnect'));
        setWorking(true);
        try {
            const r = await setLoggingInterval(Number(intervalSec));
            toast.success(t('configuration.toastIntervalApplied'));
            setIntervalResp(r.response || '');
        } catch (e) {
            toast.error(e?.response?.data?.detail || t('configuration.toastFailed'));
        } finally {
            setWorking(false);
        }
    };

    const onCalibrate = async (action) => {
        if (!status.connected) return toast.error(t('configuration.toastConnect'));
        if (!window.confirm(t('configuration.confirmCalCmd', { action }))) return;
        setWorking(true);
        try {
            await calibrateDevice(action);
            toast.success(t('configuration.toastSent', { action }));
            refreshCal();
        } catch (e) {
            toast.error(e?.response?.data?.detail || t('configuration.toastFailed'));
        } finally {
            setWorking(false);
        }
    };

    const onWriteCalValues = async () => {
        if (!status.connected) return toast.error(t('configuration.toastConnect'));
        if (!window.confirm(t('configuration.confirmWrite'))) return;
        setWorking(true);
        try {
            const body = {};
            if (lightOffset !== '') body.light_offset_mpsas = Number(lightOffset);
            if (lightTemp !== '') body.light_temperature_c = Number(lightTemp);
            if (darkPeriod !== '') body.dark_period_s = Number(darkPeriod);
            if (darkTemp !== '') body.dark_temperature_c = Number(darkTemp);
            if (!Object.keys(body).length) {
                toast.message(t('configuration.noValues'));
                return;
            }
            const r = await setCalibrationValues(body);
            toast.success(t('configuration.toastWrote', { n: r.results.length }));
            refreshCal();
        } catch (e) {
            toast.error(e?.response?.data?.detail || t('configuration.toastFailed'));
        } finally {
            setWorking(false);
        }
    };

    return (
        <div>
            <PageHeader title={t('configuration.title')} description={t('configuration.description')} />

            <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
                <Card className="xl:col-span-6 bg-card/60">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Settings2 className="size-4 text-primary" /> {t('configuration.loggingInterval')}
                        </CardTitle>
                        <CardDescription>{t('configuration.loggingIntervalDesc')}</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="space-y-1.5">
                            <label className="text-xs text-muted-foreground">{t('configuration.intervalSec')}</label>
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
                            {t('configuration.applyOnDevice')}
                        </Button>
                        {intervalResp && (
                            <div>
                                <div className="text-[11px] uppercase tracking-wide text-muted-foreground">{t('configuration.deviceResponse')}</div>
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
                            <Clock className="size-4 text-primary" /> {t('configuration.rtcTitle')}
                        </CardTitle>
                        <CardDescription>{t('configuration.rtcDesc')}</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-3">
                        <Button onClick={readClock} variant="secondary" size="sm" disabled={!status.connected} data-testid="read-clock-button">
                            <RefreshCw className="size-3.5 mr-2" /> {t('configuration.readClock')}
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
                        <CardTitle>{t('configuration.calibrationTitle')}</CardTitle>
                        <CardDescription>{t('configuration.calibrationDesc')}</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-3">
                        <div className="flex gap-2 flex-wrap">
                            <Button onClick={refreshCal} variant="secondary" size="sm" data-testid="refresh-cal-button">
                                <RefreshCw className="size-3.5 mr-2" /> {t('configuration.readCal')}
                            </Button>
                            <Button onClick={() => onCalibrate('arm_light')} disabled={working || !status.connected} data-testid="arm-cal-button">
                                <Sun className="size-4 mr-2" /> {t('configuration.armLight')}
                            </Button>
                            <Button onClick={() => onCalibrate('arm_dark')} disabled={working || !status.connected} data-testid="arm-dark-cal-button">
                                <Moon className="size-4 mr-2" /> {t('configuration.armDark')}
                            </Button>
                            <Button onClick={() => onCalibrate('disarm')} variant="destructive" disabled={working || !status.connected} data-testid="disarm-cal-button">
                                <ShieldOff className="size-4 mr-2" /> {t('configuration.disarm')}
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
                            <ShieldCheck className="size-4 text-primary" /> {t('configuration.manualCal')}
                        </CardTitle>
                        <CardDescription>{t('configuration.manualCalDesc')}</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-3">
                        <NumField label={t('configuration.lightOffset')} value={lightOffset} onChange={setLightOffset} testid="cal-light-offset" />
                        <NumField label={t('configuration.lightTemp')} value={lightTemp} onChange={setLightTemp} testid="cal-light-temp-set" />
                        <NumField label={t('configuration.darkPeriod')} value={darkPeriod} onChange={setDarkPeriod} testid="cal-dark-period" />
                        <NumField label={t('configuration.darkTemp')} value={darkTemp} onChange={setDarkTemp} testid="cal-dark-temp-set" />
                        <Button onClick={onWriteCalValues} variant="destructive" disabled={working || !status.connected} data-testid="write-cal-button">
                            {working ? <Loader2 className="size-4 mr-2 animate-spin" /> : null}
                            {t('configuration.writeToDevice')}
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

function NumField({ label, value, onChange, testid }) {
    return (
        <div className="space-y-1">
            <label className="text-[11px] text-muted-foreground">{label}</label>
            <Input value={value} onChange={(e) => onChange(e.target.value)} data-testid={testid} type="number" step="any" />
        </div>
    );
}
