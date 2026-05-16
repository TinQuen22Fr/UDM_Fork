import React, { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
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
import { listLogSessions, logDownloadUrl, startLogging, stopLogging } from '@/lib/api';
import { useDevice } from '@/context/DeviceContext';

export default function LoggingPage() {
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
        if (!status.connected) return toast.error('Connect a device first');
        setWorking(true);
        try {
            await startLogging({
                interval_seconds: Number(interval),
                format,
                base_name: name || null,
            });
            toast.success('Logging started');
        } catch (e) {
            toast.error(e?.response?.data?.detail || 'Start failed');
        } finally {
            setWorking(false);
        }
    };
    const onStop = async () => {
        setWorking(true);
        try {
            await stopLogging();
            toast.success('Logging stopped');
            refresh();
        } catch (e) {
            toast.error('Stop failed');
        } finally {
            setWorking(false);
        }
    };

    const active = loggingSession?.active;

    return (
        <div>
            <PageHeader
                title="Continuous Logging"
                description="Persist readings to CSV / DAT files. Files are written under the host's log directory."
                actions={
                    <Button variant="secondary" onClick={refresh} data-testid="logs-refresh-button">
                        <RefreshCw className="size-4 mr-2" />
                        Refresh
                    </Button>
                }
            />

            <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
                <Card className="xl:col-span-5 bg-card/60">
                    <CardHeader>
                        <CardTitle>Logging Session</CardTitle>
                        <CardDescription>
                            {active ? (
                                <span className="text-[hsl(var(--telemetry-good))]">Currently running</span>
                            ) : (
                                'Configure and start a new logging session.'
                            )}
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="space-y-1.5">
                            <label className="text-xs text-muted-foreground">Interval (seconds)</label>
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
                            <label className="text-xs text-muted-foreground">Format</label>
                            <Select value={format} onValueChange={setFormat} disabled={active}>
                                <SelectTrigger data-testid="logging-format-select">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="csv">CSV (Comma-separated)</SelectItem>
                                    <SelectItem value="dat">DAT (Semicolon-separated, Unihedron)</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-1.5">
                            <label className="text-xs text-muted-foreground">File name (optional)</label>
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
                                Stop Logging
                            </Button>
                        ) : (
                            <Button onClick={onStart} className="w-full" disabled={working || !status.connected} data-testid="logging-start-button">
                                {working ? <Loader2 className="size-4 mr-2 animate-spin" /> : <Play className="size-4 mr-2" />}
                                Start Logging
                            </Button>
                        )}
                    </CardContent>
                </Card>

                <Card className="xl:col-span-7 bg-card/60">
                    <CardHeader>
                        <CardTitle>Session Status</CardTitle>
                        <CardDescription>Live counters and last sample.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        {loggingSession ? (
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
                                <StatTile label="State" value={active ? 'Running' : 'Stopped'} good={active} />
                                <StatTile label="Samples" value={loggingSession.samples} />
                                <StatTile label="Interval" value={`${loggingSession.interval_seconds}s`} />
                                <StatTile label="Format" value={loggingSession.format?.toUpperCase()} />
                            </div>
                        ) : (
                            <p className="text-sm text-muted-foreground mb-4">No session yet.</p>
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

                <Card className="xl:col-span-12 bg-card/60">
                    <CardHeader>
                        <CardTitle>Recorded Files</CardTitle>
                        <CardDescription>Files saved to the host. Click to download.</CardDescription>
                    </CardHeader>
                    <CardContent className="p-0">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead className="w-[60%]">File</TableHead>
                                    <TableHead className="text-right">Size</TableHead>
                                    <TableHead>Modified</TableHead>
                                    <TableHead className="text-right">Action</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {sessions.length === 0 && (
                                    <TableRow>
                                        <TableCell colSpan={4} className="text-center text-sm text-muted-foreground py-6">
                                            No files yet.
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
                                                    <Download className="size-3.5 mr-1.5" /> Download
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
