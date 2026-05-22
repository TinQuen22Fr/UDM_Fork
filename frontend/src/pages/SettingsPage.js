import React, { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { Globe, Moon, Languages, LayoutDashboard, Info, Save, Eraser, Loader2, Wand2 } from 'lucide-react';
import { PageHeader } from '@/components/PageHeader';
import { useI18n } from '@/context/I18nContext';
import { useDevice } from '@/context/DeviceContext';
import { getSqmProIdentity, getSystemInfo } from '@/lib/api';
import { cn } from '@/lib/utils';

const STORAGE_SENSOR_ID = 'udm.dashboard.sensorId';
const STORAGE_SENSOR_KEY = 'udm.dashboard.sensorKey';

export default function SettingsPage() {
    const { t, lang, setLang } = useI18n();
    const { status } = useDevice();
    const [nightVision, setNightVision] = useState(() => localStorage.getItem('udm.nightVision') === '1');
    const [sensorId, setSensorId] = useState(() => localStorage.getItem(STORAGE_SENSOR_ID) || '');
    const [sensorKey, setSensorKey] = useState(() => localStorage.getItem(STORAGE_SENSOR_KEY) || '');
    const [detecting, setDetecting] = useState(false);
    const [sys, setSys] = useState(null);

    useEffect(() => {
        getSystemInfo().then(setSys).catch(() => {});
    }, []);

    useEffect(() => {
        document.documentElement.classList.toggle('night-vision', nightVision);
        localStorage.setItem('udm.nightVision', nightVision ? '1' : '0');
        window.dispatchEvent(new CustomEvent('udm:night-vision', { detail: nightVision }));
    }, [nightVision]);

    const handleLangChange = (newLang) => {
        setLang(newLang);
        toast.success(t('settings.toastLangChanged'));
    };

    const saveSensorConfig = () => {
        if (sensorId.trim()) {
            localStorage.setItem(STORAGE_SENSOR_ID, sensorId.trim());
        } else {
            localStorage.removeItem(STORAGE_SENSOR_ID);
        }
        if (sensorKey.trim()) {
            localStorage.setItem(STORAGE_SENSOR_KEY, sensorKey.trim());
        } else {
            localStorage.removeItem(STORAGE_SENSOR_KEY);
        }
        window.dispatchEvent(new CustomEvent('udm:sensor-changed', { detail: { sensorId, sensorKey } }));
        toast.success(t('settings.toastSaved'));
    };

    const clearSensorConfig = () => {
        setSensorId('');
        setSensorKey('');
        localStorage.removeItem(STORAGE_SENSOR_ID);
        localStorage.removeItem(STORAGE_SENSOR_KEY);
        window.dispatchEvent(new CustomEvent('udm:sensor-changed', { detail: { sensorId: '', sensorKey: '' } }));
        toast.success(t('dashboard.toastSensorCleared'));
    };

    const autoDetect = async () => {
        if (!status.connected) {
            toast.error(t('readings.toastConnectFirst'));
            return;
        }
        setDetecting(true);
        try {
            const identity = await getSqmProIdentity();
            if (identity?.sensor_id) {
                setSensorId(identity.sensor_id);
                localStorage.setItem(STORAGE_SENSOR_ID, identity.sensor_id);
                window.dispatchEvent(new CustomEvent('udm:sensor-changed', { detail: { sensorId: identity.sensor_id } }));
                toast.success(t('dashboard.toastSensorDetected', { id: identity.sensor_id }));
            } else {
                toast.error(t('dashboard.toastSensorNotFound'));
            }
        } catch (e) {
            toast.error(e?.response?.data?.detail || t('dashboard.toastSensorNotFound'));
        } finally {
            setDetecting(false);
        }
    };

    return (
        <div>
            <PageHeader title={t('settings.title')} description={t('settings.description')} />

            <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
                {/* Language */}
                <Card className="xl:col-span-6 bg-card/60">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Languages className="size-4 text-primary" /> {t('settings.language')}
                        </CardTitle>
                        <CardDescription>{t('settings.languageDesc')}</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="grid grid-cols-2 gap-3">
                            <button
                                type="button"
                                onClick={() => handleLangChange('fr')}
                                data-testid="settings-lang-fr"
                                className={cn(
                                    'flex items-center justify-center gap-2 rounded-lg border px-4 py-3 transition-colors',
                                    lang === 'fr'
                                        ? 'border-primary/60 bg-primary/10 text-foreground'
                                        : 'border-border hover:bg-accent/40 text-muted-foreground'
                                )}
                            >
                                <span className="text-xl" aria-hidden="true">🇫🇷</span>
                                <span className="font-medium">{t('settings.languageFr')}</span>
                            </button>
                            <button
                                type="button"
                                onClick={() => handleLangChange('en')}
                                data-testid="settings-lang-en"
                                className={cn(
                                    'flex items-center justify-center gap-2 rounded-lg border px-4 py-3 transition-colors',
                                    lang === 'en'
                                        ? 'border-primary/60 bg-primary/10 text-foreground'
                                        : 'border-border hover:bg-accent/40 text-muted-foreground'
                                )}
                            >
                                <span className="text-xl" aria-hidden="true">🇬🇧</span>
                                <span className="font-medium">{t('settings.languageEn')}</span>
                            </button>
                        </div>
                    </CardContent>
                </Card>

                {/* Appearance */}
                <Card className="xl:col-span-6 bg-card/60">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Moon className="size-4 text-primary" /> {t('settings.appearance')}
                        </CardTitle>
                        <CardDescription>{t('settings.appearanceDesc')}</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="flex items-start justify-between gap-4 rounded-lg border border-border p-3">
                            <div className="flex-1">
                                <div className="text-sm font-medium">{t('settings.nightVisionLabel')}</div>
                                <div className="text-xs text-muted-foreground mt-0.5">{t('settings.nightVisionDesc')}</div>
                            </div>
                            <Switch
                                checked={nightVision}
                                onCheckedChange={setNightVision}
                                data-testid="settings-night-vision-toggle"
                            />
                        </div>
                    </CardContent>
                </Card>

                {/* Dashboard Sync */}
                <Card className="xl:col-span-12 bg-card/60">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <LayoutDashboard className="size-4 text-primary" /> {t('settings.dashboardSync')}
                        </CardTitle>
                        <CardDescription>{t('settings.dashboardSyncDesc')}</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-1.5">
                                <label className="text-xs text-muted-foreground">{t('dashboard.sensorIdLabel')}</label>
                                <Input
                                    value={sensorId}
                                    onChange={(e) => setSensorId(e.target.value)}
                                    placeholder="e.g. SQMPRO-XXXXXXXXX"
                                    data-testid="settings-sensor-id-input"
                                    className="font-mono"
                                />
                                <p className="text-[11px] text-muted-foreground">{t('dashboard.sensorIdHelp')}</p>
                            </div>
                            <div className="space-y-1.5">
                                <label className="text-xs text-muted-foreground">{t('dashboard.sensorKeyLabel')}</label>
                                <Input
                                    type="password"
                                    value={sensorKey}
                                    onChange={(e) => setSensorKey(e.target.value)}
                                    placeholder="••••••••••••"
                                    data-testid="settings-sensor-key-input"
                                    className="font-mono"
                                />
                                <p className="text-[11px] text-muted-foreground">{t('dashboard.sensorKeyHelp')}</p>
                            </div>
                        </div>
                        <div className="flex flex-wrap gap-2">
                            <Button onClick={saveSensorConfig} data-testid="settings-save-sensor">
                                <Save className="size-4 mr-2" /> {t('common.save')}
                            </Button>
                            <Button onClick={autoDetect} variant="secondary" disabled={detecting || !status.connected} data-testid="settings-autodetect">
                                {detecting ? <Loader2 className="size-4 mr-2 animate-spin" /> : <Wand2 className="size-4 mr-2" />}
                                {t('dashboard.autoDetect')}
                            </Button>
                            <Button onClick={clearSensorConfig} variant="ghost" data-testid="settings-clear-sensor">
                                <Eraser className="size-4 mr-2" /> {t('dashboard.clearSensor')}
                            </Button>
                        </div>
                    </CardContent>
                </Card>

                {/* About */}
                <Card className="xl:col-span-12 bg-card/60">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Info className="size-4 text-primary" /> {t('settings.about')}
                        </CardTitle>
                        <CardDescription>{t('settings.aboutDesc')}</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-x-6 gap-y-2 text-sm">
                            <Row label={t('information.app')} value={sys ? `${sys.app} v${sys.version}` : '—'} />
                            <Row label={t('information.python')} value={sys?.python} />
                            <Row label={t('information.platform')} value={sys?.platform} />
                            <Row label={t('information.mockMode')} value={sys?.mock_mode ? t('common.enabled') : t('common.disabled')} />
                            <Row label="pyudev" value={sys?.has_pyudev ? t('common.available') : t('common.missing')} />
                            <Row label="esptool" value={sys?.has_esptool ? t('common.available') : t('common.notInstalled')} />
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}

function Row({ label, value }) {
    return (
        <div className="flex items-center justify-between border-b border-border/60 py-1.5">
            <span className="text-xs text-muted-foreground">{label}</span>
            <span className="font-mono text-xs">{value || '—'}</span>
        </div>
    );
}
