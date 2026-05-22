import React, { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Square, Play, Loader2, Download, FileText, FolderOpen, RefreshCw } from 'lucide-react';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import { PageHeader } from '@/components/PageHeader';
import { DLHeaderForm } from '@/components/DLHeaderForm';
import { listLogSessions, logDownloadUrl, startLogging, stopLogging } from '@/lib/api';
import { useDevice } from '@/context/DeviceContext';
import { useI18n } from '@/context/I18nContext';

export default function LoggingPage() {
    const { t } = useI18n();
    const { status, loggingSession } = useDevice();
    const [interval, setIntervalSec] = useState(1);
    const [format, setFormat] = useState('csv');
    const [name, setName] = useState('');
    const [working, setWorking] = useState(false);
    const [sessions, setSessions] = useState([]);

    const refresh = async () => {
        try {
            const s = await listLogSessions();
            setSessions(s.sessions || []);
        } catch (e) { /* ignore */ }
    };

    useEffect(() => {
        refresh();
        const id = setInterval(refresh, 4000);
        return () => clearInterval(id);
    }, []);

    const onStart = async () => {
        if (!status.connected) return toast.error(t('logging.toastConnectFirst'));
        setWorking(true);
        try {
            await startLogging({
                interval_seconds: Number(interval),
                format,
                base_name: name || null,
            });
            toast.success(t('logging.toastStarted'));
        } catch (e) {
            toast.error(e?.response?.data?.detail || t('logging.toastStartFailed'));
        } finally {
            setWorking(false);
        }
    };
    const onStop = async () => {
        setWorking(true);
        try {
            await stopLogging();
            toast.success(t('logging.toastStopped'));
            refresh();
        } catch (e) {
            toast.error(t('logging.toastStopFailed'));
        } finally {
            setWorking(false);
        }
    };

    const active = loggingSession?.active;

    return (
        <div>
            <PageHeader
                title={t('logging.title')}
                description={t('logging.description')}
                actions={
                    <Button variant="secondary" onClick={refresh} data-testid="logs-refresh-button">
                        <RefreshCw className="size-4 mr-2" />
                        {t('common.refresh')}
                    </Button>
                }
            />

            <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
                <Card className="xl:col-span-5 bg-card/60">
                    <CardHeader>
                        <CardTitle>{t('logging.loggingSession')}</CardTitle>
                        <CardDescription>
                            {active ? (
                                <span className="text-[hsl(var(--telemetry-good))]">{t('logging.currentlyRunning')}</span>
                            ) : (
                                t('logging.configureStart')
                            )}
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="space-y-1.5">
                            <label className="text-xs text-muted-foreground">{t('logging.intervalLabel')}</label>
                            <Input
                                type="number"
                                min={1}
                                max={3600}
                                value={interval}
                                onChange={(e) => setIntervalSec(e.target.value)}
                                disabled={active}
                                data-testid="logging-interval-input"
                            />
                        </div>
                        <div className="space-y-1.5">
                            <label className="text-xs text-muted-foreground">{t('logging.formatLabel')}</label>
                            <Select value={format} onValueChange={setFormat} disabled={active}>
                                <SelectTrigger data-testid="logging-format-select">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="csv">{t('logging.formatCsv')}</SelectItem>
                                    <SelectItem value="dat">{t('logging.formatDat')}</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-1.5">
                            <label className="text-xs text-muted-foreground">{t('logging.fileName')}</label>
                            <Input
                                placeholder="sqm_2025-01-01.csv"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                disabled={active}
                                data-testid="logging-name-input"
                            />
                        </div>

                        {active ? (
                            <Button onClick={onStop} variant="destructive" className="w-full" disabled={working} data-testid="logging-stop-button">
                                {working ? <Loader2 className="size-4 mr-2 animate-spin" /> : <Square className="size-4 mr-2" />}
                                {t('logging.stopLogging')}
                            </Button>
                        ) : (
                            <Button onClick={onStart} className="w-full" disabled={working || !status.connected} data-testid="logging-start-button">
                                {working ? <Loader2 className="size-4 mr-2 animate-spin" /> : <Play className="size-4 mr-2" />}
                                {t('logging.startLogging')}
                            </Button>
                        )}
                    </CardContent>
                </Card>

                <Card className="xl:col-span-7 bg-card/60">
                    <CardHeader>
                        <CardTitle>{t('logging.sessionStatus')}</CardTitle>
                        <CardDescription>{t('logging.sessionStatusDesc')}</CardDescription>
                    </CardHeader>
                    <CardContent>
                        {loggingSession ? (
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
                                <StatTile label={t('logging.stateLabel')} value={active ? t('common.running') : t('common.stopped')} good={active} />
                                <StatTile label={t('common.samples')} value={loggingSession.samples} />
                                <StatTile label={t('common.interval')} value={`${loggingSession.interval_seconds}s`} />
                                <StatTile label={t('common.format')} value={loggingSession.format?.toUpperCase()} />
                            </div>
                        ) : (
                            <p className="text-sm text-muted-foreground mb-4">{t('logging.noSession')}</p>
                        )}
                        {loggingSession?.file_path && (
                            <div className="text-[11px] font-mono text-muted-foreground mb-2 truncate">
                                <FolderOpen className="size-3 inline-block mr-1" />
                                {loggingSession.file_path}
                            </div>
                        )}
                        {loggingSession?.last_sample && (
                            <pre className="font-mono text-xs whitespace-pre-wrap break-words bg-secondary/50 rounded p-2 border border-border">
                                {JSON.stringify(loggingSession.last_sample, null, 2)}
                            </pre>
                        )}
                    </CardContent>
                </Card>

                <div className="xl:col-span-12">
                    <DLHeaderForm />
                </div>

                <Card className="xl:col-span-12 bg-card/60">
                    <CardHeader>
                        <CardTitle>{t('logging.recordedFiles')}</CardTitle>
                        <CardDescription>{t('logging.recordedFilesDesc')}</CardDescription>
                    </CardHeader>
                    <CardContent className="p-0">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead className="w-[60%]">{t('common.file')}</TableHead>
                                    <TableHead className="text-right">{t('common.size')}</TableHead>
                                    <TableHead>{t('common.modified')}</TableHead>
                                    <TableHead className="text-right">{t('common.action')}</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {sessions.length === 0 && (
                                    <TableRow>
                                        <TableCell colSpan={4} className="text-center text-sm text-muted-foreground py-6">
                                            {t('logging.noFiles')}
                                        </TableCell>
                                    </TableRow>
                                )}
                                {sessions.map((s) => (
                                    <TableRow key={s.path}>
                                        <TableCell className="font-mono text-xs">
                                            <FileText className="size-3 inline-block mr-1.5" />
                                            {s.name}
                                        </TableCell>
                                        <TableCell className="text-right font-mono tabular-nums text-xs">
                                            {(s.size_bytes / 1024).toFixed(1)} KB
                                        </TableCell>
                                        <TableCell className="font-mono text-xs text-muted-foreground">
                                            {new Date(s.modified).toLocaleString()}
                                        </TableCell>
                                        <TableCell className="text-right">
                                            <a
                                                href={logDownloadUrl(s.name)}
                                                target="_blank"
                                                rel="noreferrer"
                                                data-testid={`download-log-${s.name}`}
                                            >
                                                <Button size="sm" variant="ghost">
                                                    <Download className="size-3.5 mr-1.5" /> {t('common.download')}
                                                </Button>
                                            </a>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}

function StatTile({ label, value, good }) {
    return (
        <div className="rounded-lg border border-border p-3">
            <div className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</div>
            <div className={`font-mono text-lg tabular-nums ${good ? 'text-[hsl(var(--telemetry-good))]' : ''}`}>
                {value ?? '—'}
            </div>
        </div>
    );
}
