import React, { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Loader2, RefreshCw, Cpu, Hash, Fingerprint, Wifi, Layers } from 'lucide-react';
import { PageHeader } from '@/components/PageHeader';
import { getDeviceInfo, getCalibrationInfo, getSystemInfo } from '@/lib/api';
import { useDevice } from '@/context/DeviceContext';

function Field({ icon: Icon, label, value, testid }) {
    return (
        <div className="flex items-start gap-3 py-2.5 border-b border-border/60 last:border-0">
            <div className="size-8 rounded-md bg-secondary border border-border flex items-center justify-center shrink-0">
                <Icon className="size-4 text-muted-foreground" />
            </div>
            <div className="flex-1">
                <div className="text-[11px] uppercase tracking-wide text-muted-foreground">{label}</div>
                <div className="font-mono text-sm mt-0.5" data-testid={testid}>
                    {value ?? '—'}
                </div>
            </div>
        </div>
    );
}

export default function InformationPage() {
    const { status, info, setInfo } = useDevice();
    const [loading, setLoading] = useState(false);
    const [cal, setCal] = useState(null);
    const [sys, setSys] = useState(null);

    const refresh = async () => {
        setLoading(true);
        try {
            const s = await getSystemInfo();
            setSys(s);
            if (status.connected) {
                const i = await getDeviceInfo();
                setInfo(i);
                try {
                    const c = await getCalibrationInfo();
                    setCal(c);
                } catch (e) { /* not all devices return cx */ }
            }
        } catch (e) {
            toast.error(e?.response?.data?.detail || 'Failed to fetch info');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        refresh();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [status.connected]);

    return (
        <div>
            <PageHeader
                title="Device Information"
                description="Identification (ix) and calibration (cx) data returned by the SQM. Also shows host info."
                actions={
                    <Button onClick={refresh} variant="secondary" data-testid="refresh-info-button">
                        {loading ? (
                            <Loader2 className="size-4 mr-2 animate-spin" />
                        ) : (
                            <RefreshCw className="size-4 mr-2" />
                        )}
                        Refresh
                    </Button>
                }
            />

            <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
                <Card className="xl:col-span-6 bg-card/60">
                    <CardHeader>
                        <CardTitle>SQM Identity</CardTitle>
                        <CardDescription>Response to the <span className="font-mono">ix</span> command.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        {!status.connected ? (
                            <p className="text-sm text-muted-foreground">Connect a device first to see its identity.</p>
                        ) : (
                            <div>
                                <Field icon={Layers} label="Protocol Number" value={info?.protocol_number} testid="info-protocol" />
                                <Field icon={Cpu} label="Model Number" value={info?.model_number} testid="info-model" />
                                <Field icon={Hash} label="Feature Number" value={info?.feature_number} testid="info-feature" />
                                <Field icon={Fingerprint} label="Serial Number" value={info?.serial_number} testid="info-serial" />
                                <Field icon={Wifi} label="MAC Address" value={info?.mac_address} testid="info-mac" />
                                <Field icon={Hash} label="Raw" value={info?.raw} testid="info-raw" />
                            </div>
                        )}
                    </CardContent>
                </Card>

                <Card className="xl:col-span-6 bg-card/60">
                    <CardHeader>
                        <CardTitle>Calibration</CardTitle>
                        <CardDescription>Response to the <span className="font-mono">cx</span> command.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        {!status.connected ? (
                            <p className="text-sm text-muted-foreground">Connect a device first to see its calibration.</p>
                        ) : (
                            <div>
                                <Field
                                    icon={Layers}
                                    label="Light Calibration (mpsas)"
                                    value={cal?.light_calibration_mpsas?.toFixed(3)}
                                    testid="cal-light-mpsas"
                                />
                                <Field
                                    icon={Layers}
                                    label="Light Calibration Period (s)"
                                    value={cal?.light_calibration_period_s}
                                    testid="cal-light-period"
                                />
                                <Field
                                    icon={Layers}
                                    label="Light Calibration Temperature (°C)"
                                    value={cal?.light_calibration_temperature_c?.toFixed(1)}
                                    testid="cal-light-temp"
                                />
                                <Field
                                    icon={Layers}
                                    label="Dark Calibration (mpsas)"
                                    value={cal?.dark_calibration_mpsas?.toFixed(3)}
                                    testid="cal-dark-mpsas"
                                />
                                <Field
                                    icon={Layers}
                                    label="Dark Calibration Temperature (°C)"
                                    value={cal?.dark_calibration_temperature_c?.toFixed(1)}
                                    testid="cal-dark-temp"
                                />
                            </div>
                        )}
                    </CardContent>
                </Card>

                <Card className="xl:col-span-12 bg-card/60">
                    <CardHeader>
                        <CardTitle>Host Information</CardTitle>
                        <CardDescription>Backend running on this machine.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-x-6">
                            <Field icon={Cpu} label="App" value={sys?.app + ' v' + sys?.version} testid="sys-app" />
                            <Field icon={Cpu} label="Python" value={sys?.python} />
                            <Field icon={Cpu} label="Platform" value={sys?.platform} />
                            <Field icon={Hash} label="Mock Mode" value={sys?.mock_mode ? 'enabled' : 'disabled'} />
                            <Field icon={Hash} label="pyudev" value={sys?.has_pyudev ? 'available' : 'missing'} />
                            <Field icon={Hash} label="esptool" value={sys?.has_esptool ? 'available' : 'not installed'} />
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
