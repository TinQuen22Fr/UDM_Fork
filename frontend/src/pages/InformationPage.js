import React, { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Loader2, RefreshCw, Cpu, Hash, Fingerprint, Wifi, Layers } from 'lucide-react';
import { PageHeader } from '@/components/PageHeader';
import { getDeviceInfo, getCalibrationInfo, getSystemInfo } from '@/lib/api';
import { useDevice } from '@/context/DeviceContext';
import { useI18n } from '@/context/I18nContext';

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
    const { t } = useI18n();
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
            toast.error(e?.response?.data?.detail || t('information.toastFetchFailed'));
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
                title={t('information.title')}
                description={t('information.description')}
                actions={
                    <Button onClick={refresh} variant="secondary" data-testid="refresh-info-button">
                        {loading ? (
                            <Loader2 className="size-4 mr-2 animate-spin" />
                        ) : (
                            <RefreshCw className="size-4 mr-2" />
                        )}
                        {t('common.refresh')}
                    </Button>
                }
            />

            <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
                <Card className="xl:col-span-6 bg-card/60">
                    <CardHeader>
                        <CardTitle>{t('information.sqmIdentity')}</CardTitle>
                        <CardDescription>{t('information.identityDesc')}</CardDescription>
                    </CardHeader>
                    <CardContent>
                        {!status.connected ? (
                            <p className="text-sm text-muted-foreground">{t('information.connectFirstIdentity')}</p>
                        ) : (
                            <div>
                                <Field icon={Layers} label={t('information.protocolNumber')} value={info?.protocol_number} testid="info-protocol" />
                                <Field icon={Cpu} label={t('information.modelNumber')} value={info?.model_number} testid="info-model" />
                                <Field icon={Hash} label={t('information.featureNumber')} value={info?.feature_number} testid="info-feature" />
                                <Field icon={Fingerprint} label={t('information.serialNumber')} value={info?.serial_number} testid="info-serial" />
                                <Field icon={Wifi} label={t('information.macAddress')} value={info?.mac_address} testid="info-mac" />
                                <Field icon={Hash} label={t('information.rawResponse')} value={info?.raw} testid="info-raw" />
                            </div>
                        )}
                    </CardContent>
                </Card>

                <Card className="xl:col-span-6 bg-card/60">
                    <CardHeader>
                        <CardTitle>{t('information.calibration')}</CardTitle>
                        <CardDescription>{t('information.calibrationDesc')}</CardDescription>
                    </CardHeader>
                    <CardContent>
                        {!status.connected ? (
                            <p className="text-sm text-muted-foreground">{t('information.connectFirstCalibration')}</p>
                        ) : (
                            <div>
                                <Field icon={Layers} label={t('information.lightCalMpsas')} value={cal?.light_calibration_mpsas?.toFixed(3)} testid="cal-light-mpsas" />
                                <Field icon={Layers} label={t('information.lightCalPeriod')} value={cal?.light_calibration_period_s} testid="cal-light-period" />
                                <Field icon={Layers} label={t('information.lightCalTemp')} value={cal?.light_calibration_temperature_c?.toFixed(1)} testid="cal-light-temp" />
                                <Field icon={Layers} label={t('information.darkCalMpsas')} value={cal?.dark_calibration_mpsas?.toFixed(3)} testid="cal-dark-mpsas" />
                                <Field icon={Layers} label={t('information.darkCalTemp')} value={cal?.dark_calibration_temperature_c?.toFixed(1)} testid="cal-dark-temp" />
                            </div>
                        )}
                    </CardContent>
                </Card>

                <Card className="xl:col-span-12 bg-card/60">
                    <CardHeader>
                        <CardTitle>{t('information.hostInfo')}</CardTitle>
                        <CardDescription>{t('information.hostDesc')}</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-x-6">
                            <Field icon={Cpu} label={t('information.app')} value={sys ? `${sys.app} v${sys.version}` : null} testid="sys-app" />
                            <Field icon={Cpu} label={t('information.python')} value={sys?.python} />
                            <Field icon={Cpu} label={t('information.platform')} value={sys?.platform} />
                            <Field icon={Hash} label={t('information.mockMode')} value={sys?.mock_mode ? t('common.enabled') : t('common.disabled')} />
                            <Field icon={Hash} label="pyudev" value={sys?.has_pyudev ? t('common.available') : t('common.missing')} />
                            <Field icon={Hash} label="esptool" value={sys?.has_esptool ? t('common.available') : t('common.notInstalled')} />
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
