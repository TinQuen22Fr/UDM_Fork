import React, { useEffect, useState, useCallback } from 'react';
import { toast } from 'sonner';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import {
    LayoutDashboard,
    ExternalLink,
    RefreshCw,
    Wand2,
    Save,
    Eraser,
    AlertTriangle,
    Loader2,
    Settings as SettingsIcon,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { PageHeader } from '@/components/PageHeader';
import { useI18n } from '@/context/I18nContext';
import { useDevice } from '@/context/DeviceContext';
import { getSqmProIdentity } from '@/lib/api';

const STORAGE_SENSOR_ID = 'udm.dashboard.sensorId';
const DASHBOARD_BASE = 'https://sqm.quentin-astro.fr/dashboard';

function buildDashboardUrl(sensorId) {
    if (!sensorId) return null;
    return `${DASHBOARD_BASE}/${encodeURIComponent(sensorId)}`;
}

export default function DashboardPage() {
    const { t } = useI18n();
    const { status } = useDevice();
    const [sensorId, setSensorId] = useState(() => localStorage.getItem(STORAGE_SENSOR_ID) || '');
    const [draftId, setDraftId] = useState(() => localStorage.getItem(STORAGE_SENSOR_ID) || '');
    const [iframeKey, setIframeKey] = useState(0);
    const [detecting, setDetecting] = useState(false);

    // Sync with cross-page sensor changes (e.g. saved in Settings)
    useEffect(() => {
        const handler = (e) => {
            const id = e?.detail?.sensorId ?? localStorage.getItem(STORAGE_SENSOR_ID) ?? '';
            setSensorId(id);
            setDraftId(id);
            setIframeKey((k) => k + 1);
        };
        window.addEventListener('udm:sensor-changed', handler);
        return () => window.removeEventListener('udm:sensor-changed', handler);
    }, []);

    const saveAndReload = useCallback(() => {
        const clean = draftId.trim();
        if (clean) {
            localStorage.setItem(STORAGE_SENSOR_ID, clean);
        } else {
            localStorage.removeItem(STORAGE_SENSOR_ID);
        }
        setSensorId(clean);
        setIframeKey((k) => k + 1);
        window.dispatchEvent(new CustomEvent('udm:sensor-changed', { detail: { sensorId: clean } }));
        toast.success(t('dashboard.savedSensor', { id: clean || '—' }));
    }, [draftId, t]);

    const clearConfig = () => {
        setDraftId('');
        setSensorId('');
        localStorage.removeItem(STORAGE_SENSOR_ID);
        window.dispatchEvent(new CustomEvent('udm:sensor-changed', { detail: { sensorId: '' } }));
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
                setDraftId(identity.sensor_id);
                setSensorId(identity.sensor_id);
                localStorage.setItem(STORAGE_SENSOR_ID, identity.sensor_id);
                window.dispatchEvent(new CustomEvent('udm:sensor-changed', { detail: { sensorId: identity.sensor_id } }));
                setIframeKey((k) => k + 1);
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

    const dashboardUrl = buildDashboardUrl(sensorId);

    return (
        <div>
            <PageHeader
                title={t('dashboard.title')}
                description={t('dashboard.description')}
                actions={
                    <div className="flex items-center gap-2">
                        {dashboardUrl && (
                            <a href={dashboardUrl} target="_blank" rel="noreferrer" data-testid="dashboard-open-external">
                                <Button variant="secondary">
                                    <ExternalLink className="size-4 mr-2" /> {t('dashboard.openExternal')}
                                </Button>
                            </a>
                        )}
                        <Button
                            onClick={() => setIframeKey((k) => k + 1)}
                            variant="ghost"
                            disabled={!sensorId}
                            data-testid="dashboard-reload"
                        >
                            <RefreshCw className="size-4 mr-2" /> {t('dashboard.reload')}
                        </Button>
                    </div>
                }
            />

            <Card className="bg-card/60 mb-6">
                <CardHeader className="pb-3">
                    <CardTitle className="flex items-center gap-2 text-base">
                        <SettingsIcon className="size-4 text-primary" /> {t('settings.dashboardSync')}
                    </CardTitle>
                    <CardDescription className="text-xs">{t('dashboard.sensorIdHelp')}</CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-end">
                        <div className="md:col-span-6 space-y-1.5">
                            <label className="text-xs text-muted-foreground">{t('dashboard.sensorIdLabel')}</label>
                            <Input
                                value={draftId}
                                onChange={(e) => setDraftId(e.target.value)}
                                placeholder="SQMPRO-XXXXXXXXX"
                                className="font-mono"
                                data-testid="dashboard-sensor-id-input"
                                onKeyDown={(e) => { if (e.key === 'Enter') saveAndReload(); }}
                            />
                        </div>
                        <div className="md:col-span-6 flex flex-wrap gap-2">
                            <Button onClick={saveAndReload} data-testid="dashboard-save-sensor">
                                <Save className="size-4 mr-2" /> {t('common.save')}
                            </Button>
                            <Button onClick={autoDetect} variant="secondary" disabled={detecting || !status.connected} data-testid="dashboard-autodetect">
                                {detecting ? <Loader2 className="size-4 mr-2 animate-spin" /> : <Wand2 className="size-4 mr-2" />}
                                {t('dashboard.autoDetect')}
                            </Button>
                            <Button onClick={clearConfig} variant="ghost" data-testid="dashboard-clear-sensor">
                                <Eraser className="size-4 mr-2" /> {t('dashboard.clearSensor')}
                            </Button>
                        </div>
                    </div>
                    {sensorId && (
                        <div className="mt-3 text-xs text-muted-foreground flex items-center gap-2 flex-wrap">
                            <Badge variant="outline" className="font-mono">{sensorId}</Badge>
                            <span>→</span>
                            <a href={dashboardUrl} target="_blank" rel="noreferrer" className="font-mono text-primary hover:underline truncate" data-testid="dashboard-url-link">
                                {dashboardUrl}
                            </a>
                        </div>
                    )}
                </CardContent>
            </Card>

            {!sensorId ? (
                <Card className="bg-card/60">
                    <CardContent className="py-12 text-center">
                        <LayoutDashboard className="size-10 text-muted-foreground mx-auto mb-3 opacity-60" />
                        <h3 className="text-base font-semibold mb-1">{t('dashboard.emptyTitle')}</h3>
                        <p className="text-sm text-muted-foreground max-w-md mx-auto">{t('dashboard.emptyDesc')}</p>
                        <div className="mt-4 flex items-center justify-center gap-2">
                            <Link to="/settings">
                                <Button variant="secondary" size="sm">
                                    <SettingsIcon className="size-4 mr-2" /> {t('nav.settings')}
                                </Button>
                            </Link>
                        </div>
                    </CardContent>
                </Card>
            ) : (
                <>
                    <Alert className="mb-4 border-[hsl(var(--telemetry-warn))]/40 bg-[hsl(var(--telemetry-warn))]/10">
                        <AlertTriangle className="size-4 text-[hsl(var(--telemetry-warn))]" />
                        <AlertTitle>{t('dashboard.title')}</AlertTitle>
                        <AlertDescription className="text-xs">{t('dashboard.iframeBlocked')}</AlertDescription>
                    </Alert>
                    <Card className="bg-card/60 overflow-hidden">
                        <iframe
                            key={iframeKey}
                            title="SQM Dashboard"
                            src={dashboardUrl}
                            className="w-full bg-background"
                            style={{ height: 'calc(100vh - 380px)', minHeight: '500px', border: 0 }}
                            data-testid="dashboard-iframe"
                            sandbox="allow-scripts allow-same-origin allow-popups allow-forms"
                            referrerPolicy="no-referrer-when-downgrade"
                        />
                    </Card>
                </>
            )}
        </div>
    );
}
