import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Thermometer, Droplets, Gauge, Sparkles, Eye, RefreshCw, MapPin, Satellite, Clock, ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { getWeather, getGps } from '@/lib/api';
import { useI18n } from '@/context/I18nContext';

export function WeatherCard({ connected }) {
    const { t } = useI18n();
    const [data, setData] = useState(null);
    const [error, setError] = useState(null);
    const [unsupported, setUnsupported] = useState(false);
    const [loading, setLoading] = useState(false);

    const refresh = async () => {
        if (!connected) return;
        setLoading(true);
        try {
            const w = await getWeather();
            setData(w);
            setError(null);
            setUnsupported(false);
        } catch (e) {
            const msg = e?.response?.data?.detail || 'failed';
            if (msg.toLowerCase().includes('not return weather') || msg.toLowerCase().includes("'wx'")) {
                setUnsupported(true);
            } else {
                setError(msg);
            }
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (!connected) {
            setData(null);
            setUnsupported(false);
            return;
        }
        refresh();
        const id = setInterval(refresh, 5000);
        return () => clearInterval(id);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [connected]);

    if (!connected || unsupported) return null;

    return (
        <Card className="bg-card/60">
            <CardHeader className="flex flex-row items-center justify-between pb-3">
                <div>
                    <CardTitle className="flex items-center gap-2 text-base">
                        <Sparkles className="size-4 text-primary" /> {t('sqmpro.weather')}
                    </CardTitle>
                    <CardDescription className="text-xs">{t('sqmpro.weatherDesc')}</CardDescription>
                </div>
                <Button size="icon" variant="ghost" onClick={refresh} disabled={loading} data-testid="weather-refresh-button">
                    <RefreshCw className={`size-3.5 ${loading ? 'animate-spin' : ''}`} />
                </Button>
            </CardHeader>
            <CardContent>
                {error && <p className="text-xs text-[hsl(var(--telemetry-bad))]">{error}</p>}
                {data && (
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                        <Stat label={t('sqmpro.temperatureC')} value={data.temperature_c?.toFixed(1)} unit="°C" icon={Thermometer} testid="weather-temp" />
                        <Stat label={t('sqmpro.humidity')} value={data.humidity_pct?.toFixed(0)} unit="%" icon={Droplets} testid="weather-humidity" />
                        <Stat label={t('sqmpro.pressure')} value={data.pressure_hpa?.toFixed(0)} unit="hPa" icon={Gauge} testid="weather-pressure" />
                        <Stat label="Δmpsas" value={data.dmpsas?.toFixed(2)} unit="" icon={Sparkles} testid="weather-dmpsas" />
                        <Stat label="IR" value={data.ir} unit="raw" icon={Eye} testid="weather-ir" />
                        <Stat label="Visible" value={data.vis} unit="raw" icon={Eye} testid="weather-vis" />
                        <Stat label="Counts" value={data.counts} unit="" icon={Gauge} testid="weather-counts" />
                        <Stat label="OLED" value={data.oled_state} unit="" icon={Eye} testid="weather-oled" />
                    </div>
                )}
            </CardContent>
        </Card>
    );
}

export function GpsCard({ connected }) {
    const { t } = useI18n();
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(false);
    const [errorOrUnsupported, setEU] = useState(null);

    const refresh = async () => {
        if (!connected) return;
        setLoading(true);
        try {
            const g = await getGps();
            if (!g.fix_quality && (!g.latitude || !g.longitude)) {
                setEU('no-fix');
                setData(g);
            } else {
                setData(g);
                setEU(null);
            }
        } catch (e) {
            setEU('unsupported');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (!connected) {
            setData(null);
            setEU(null);
            return;
        }
        refresh();
        const id = setInterval(refresh, 10000);
        return () => clearInterval(id);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [connected]);

    if (!connected || errorOrUnsupported === 'unsupported') return null;

    const hasFix = data?.fix_quality && data.latitude != null && data.longitude != null;

    return (
        <Card className="bg-card/60">
            <CardHeader className="flex flex-row items-center justify-between pb-3">
                <div>
                    <CardTitle className="flex items-center gap-2 text-base">
                        <MapPin className="size-4 text-primary" /> {t('sqmpro.gps')}
                    </CardTitle>
                    <CardDescription className="text-xs">{t('sqmpro.gpsDesc')}</CardDescription>
                </div>
                <Button size="icon" variant="ghost" onClick={refresh} disabled={loading} data-testid="gps-refresh-button">
                    <RefreshCw className={`size-3.5 ${loading ? 'animate-spin' : ''}`} />
                </Button>
            </CardHeader>
            <CardContent>
                {!hasFix && (
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <Satellite className="size-3.5" /> {t('sqmpro.noGps')}
                        {data?.satellites != null && <span className="font-mono">({data.satellites} {t('sqmpro.satellites').toLowerCase()})</span>}
                    </div>
                )}
                {hasFix && (
                    <div className="space-y-3">
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                            <Stat label={t('sqmpro.latitude')} value={data.latitude.toFixed(5)} unit="°" icon={MapPin} testid="gps-lat" />
                            <Stat label={t('sqmpro.longitude')} value={data.longitude.toFixed(5)} unit="°" icon={MapPin} testid="gps-lng" />
                            <Stat label={t('sqmpro.satellites')} value={data.satellites} unit="" icon={Satellite} testid="gps-sats" />
                            <Stat label={t('sqmpro.time')} value={data.utc_time} unit="" icon={Clock} testid="gps-utc" />
                        </div>
                        <a
                            href={`https://www.openstreetmap.org/?mlat=${data.latitude}&mlon=${data.longitude}#map=14/${data.latitude}/${data.longitude}`}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
                            data-testid="gps-osm-link"
                        >
                            {t('sqmpro.viewOnMap')} <ExternalLink className="size-3.5" />
                        </a>
                    </div>
                )}
            </CardContent>
        </Card>
    );
}

function Stat({ label, value, unit, icon: Icon, testid }) {
    return (
        <div className="rounded-lg border border-border p-3">
            <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-wider text-muted-foreground">
                {Icon && <Icon className="size-3" />}
                <span>{label}</span>
            </div>
            <div className="mt-1 flex items-baseline gap-1">
                <span className="font-mono text-lg tabular-nums" data-testid={testid}>
                    {value ?? '—'}
                </span>
                {unit && <span className="text-[10px] text-muted-foreground">{unit}</span>}
            </div>
        </div>
    );
}
