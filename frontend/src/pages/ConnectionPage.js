import React, { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Skeleton } from '@/components/ui/skeleton';
import { Cable, Loader2, RefreshCw, Plug, PlugZap, Filter, ChevronRight } from 'lucide-react';
import { PageHeader } from '@/components/PageHeader';
import { connectDevice, disconnectDevice, fetchPorts } from '@/lib/api';
import { useDevice } from '@/context/DeviceContext';
import { useI18n } from '@/context/I18nContext';
import { cn } from '@/lib/utils';

const BAUDRATES = [9600, 19200, 38400, 57600, 115200, 230400, 460800];

const KIND_KEYS = {
    'sqm-ftdi': 'sqm-ftdi',
    'sqm-diy-ch340': 'sqm-diy-ch340',
    'sqm-diy-cp210x': 'sqm-diy-cp210x',
    'sqm-diy-pl2303': 'sqm-diy-pl2303',
};

export default function ConnectionPage() {
    const { t } = useI18n();
    const { status, refreshStatus, setInfo } = useDevice();
    const [ports, setPorts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [connecting, setConnecting] = useState(false);
    const [onlySqm, setOnlySqm] = useState(false);
    const [selectedPort, setSelectedPort] = useState('');
    const [baudrate, setBaudrate] = useState(115200);
    const [mockMode, setMockMode] = useState(false);

    const kindLabel = (kind) => t(`connection.kind.${KIND_KEYS[kind] || 'unknown'}`);

    const refresh = async () => {
        setLoading(true);
        try {
            const data = await fetchPorts(onlySqm);
            setPorts(data.ports || []);
            setMockMode(!!data.mock_mode);
            if (!selectedPort && data.ports?.length) {
                const reco = data.ports.find((p) => p.recommended);
                setSelectedPort((reco || data.ports[0]).device);
            }
        } catch (e) {
            toast.error(t('connection.toastListFailed'));
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        refresh();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [onlySqm]);

    const handleConnect = async () => {
        if (!selectedPort) return toast.error(t('connection.toastSelectPort'));
        setConnecting(true);
        try {
            const res = await connectDevice({ port: selectedPort, baudrate });
            toast.success(t('connection.toastConnected', { port: selectedPort }));
            if (res.info) setInfo(res.info);
            await refreshStatus();
        } catch (e) {
            toast.error(e?.response?.data?.detail || t('connection.toastConnectionFailed'));
        } finally {
            setConnecting(false);
        }
    };

    const handleDisconnect = async () => {
        try {
            await disconnectDevice();
            toast.success(t('connection.toastDisconnected'));
            setInfo(null);
            await refreshStatus();
        } catch (e) {
            toast.error(t('connection.toastDisconnectFailed'));
        }
    };

    return (
        <div>
            <PageHeader
                title={t('connection.title')}
                description={t('connection.description')}
                actions={
                    <Button onClick={refresh} variant="secondary" data-testid="device-scan-button">
                        {loading ? (
                            <Loader2 className="size-4 mr-2 animate-spin" />
                        ) : (
                            <RefreshCw className="size-4 mr-2" />
                        )}
                        {t('common.rescan')}
                    </Button>
                }
            />

            <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
                {/* Left: Detected devices */}
                <Card className="xl:col-span-7 bg-card/60">
                    <CardHeader className="flex flex-row items-center justify-between">
                        <div>
                            <CardTitle className="flex items-center gap-2">
                                <Cable className="size-4 text-primary" />
                                {t('connection.detectedPorts')}
                            </CardTitle>
                            <CardDescription>
                                {mockMode ? t('connection.demoDesc') : t('connection.liveDesc')}
                            </CardDescription>
                        </div>
                        <div className="flex items-center gap-2">
                            <Filter className="size-3.5 text-muted-foreground" />
                            <span className="text-xs text-muted-foreground">{t('connection.onlySqm')}</span>
                            <Switch
                                checked={onlySqm}
                                onCheckedChange={setOnlySqm}
                                data-testid="filter-only-sqm-toggle"
                            />
                        </div>
                    </CardHeader>
                    <CardContent className="space-y-2">
                        {loading && (
                            <div className="space-y-2">
                                {Array.from({ length: 3 }).map((_, i) => (
                                    <Skeleton key={i} className="h-16 w-full" />
                                ))}
                            </div>
                        )}
                        {!loading && ports.length === 0 && (
                            <div className="py-8 text-center text-sm text-muted-foreground">
                                <p>{t('connection.noPorts')}</p>
                                <p className="mt-2">{t('connection.noPortsHelp')}</p>
                            </div>
                        )}
                        {!loading &&
                            ports.map((p) => {
                                const active = selectedPort === p.device;
                                return (
                                    <button
                                        type="button"
                                        key={p.device}
                                        data-testid={`port-row-${p.device}`}
                                        onClick={() => setSelectedPort(p.device)}
                                        className={cn(
                                            'w-full text-left rounded-lg border p-3 transition-colors flex items-center gap-3',
                                            active
                                                ? 'border-primary/60 bg-primary/5'
                                                : 'border-border hover:bg-accent/40'
                                        )}
                                    >
                                        <div className="shrink-0 size-9 rounded-md bg-secondary border border-border flex items-center justify-center">
                                            <Cable className="size-4 text-muted-foreground" />
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-2">
                                                <span className="font-mono text-sm font-medium truncate">{p.device}</span>
                                                {p.recommended && (
                                                    <Badge
                                                        variant="outline"
                                                        className="text-[10px] uppercase tracking-wider bg-[hsl(var(--telemetry-good))]/15 text-[hsl(var(--telemetry-good))] border-[hsl(var(--telemetry-good))]/30"
                                                    >
                                                        {t('connection.recommended')}
                                                    </Badge>
                                                )}
                                                <Badge variant="outline" className="text-[10px]">
                                                    {kindLabel(p.kind)}
                                                </Badge>
                                            </div>
                                            <div className="mt-1 text-[11px] text-muted-foreground font-mono truncate">
                                                {p.vid_pid ? `VID:PID ${p.vid_pid}` : t('connection.noVidPid')}
                                                {p.serial_number ? ` • SN ${p.serial_number}` : ''}
                                                {p.udev_driver ? ` • driver ${p.udev_driver}` : ''}
                                            </div>
                                            <div className="text-[11px] text-muted-foreground truncate">
                                                {p.product || p.description || p.manufacturer || ''}
                                            </div>
                                        </div>
                                        <ChevronRight className="size-4 text-muted-foreground" />
                                    </button>
                                );
                            })}
                    </CardContent>
                </Card>

                {/* Right: Connection settings */}
                <Card className="xl:col-span-5 bg-card/60">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <PlugZap className="size-4 text-primary" />
                            {t('connection.connectionSettings')}
                        </CardTitle>
                        <CardDescription>{t('connection.defaultProto')}</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="space-y-1.5">
                            <label className="text-xs font-medium text-muted-foreground">{t('common.port')}</label>
                            <Select value={selectedPort} onValueChange={setSelectedPort}>
                                <SelectTrigger data-testid="port-select">
                                    <SelectValue placeholder={t('connection.selectPort')} />
                                </SelectTrigger>
                                <SelectContent>
                                    {ports.map((p) => (
                                        <SelectItem key={p.device} value={p.device}>
                                            <span className="font-mono">{p.device}</span>
                                            <span className="text-muted-foreground ml-2 text-xs">
                                                {kindLabel(p.kind)}
                                            </span>
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-1.5">
                            <label className="text-xs font-medium text-muted-foreground">{t('common.baudrate')}</label>
                            <Select
                                value={String(baudrate)}
                                onValueChange={(v) => setBaudrate(Number(v))}
                            >
                                <SelectTrigger data-testid="baudrate-select">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    {BAUDRATES.map((b) => (
                                        <SelectItem key={b} value={String(b)}>
                                            {b}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                            <p className="text-[11px] text-muted-foreground">{t('connection.baudHelp')}</p>
                        </div>

                        <div className="pt-2">
                            {status.connected ? (
                                <Button
                                    onClick={handleDisconnect}
                                    variant="destructive"
                                    className="w-full"
                                    data-testid="connect-toggle-button"
                                >
                                    <Plug className="size-4 mr-2" /> {t('connection.disconnectFrom')} {status.port}
                                </Button>
                            ) : (
                                <Button
                                    onClick={handleConnect}
                                    disabled={!selectedPort || connecting}
                                    className="w-full"
                                    data-testid="connect-toggle-button"
                                >
                                    {connecting ? (
                                        <Loader2 className="size-4 mr-2 animate-spin" />
                                    ) : (
                                        <PlugZap className="size-4 mr-2" />
                                    )}
                                    {t('common.connect')}
                                </Button>
                            )}
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
