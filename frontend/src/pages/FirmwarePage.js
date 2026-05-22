import React, { useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { UploadCloud, Loader2, FileBox, ZapOff, AlertTriangle, Info as InfoIcon } from 'lucide-react';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { PageHeader } from '@/components/PageHeader';
import { GitHubReleasesCard } from '@/components/GitHubReleasesCard';
import { flashFirmware, getFirmwareStatus, listFirmware, uploadFirmware } from '@/lib/api';
import { useDevice } from '@/context/DeviceContext';
import { useI18n } from '@/context/I18nContext';

const BAUDS = [115200, 230400, 460800, 921600];

export default function FirmwarePage() {
    const { t } = useI18n();
    const { status } = useDevice();
    const fileRef = useRef(null);
    const [files, setFiles] = useState([]);
    const [selected, setSelected] = useState('');
    const [baud, setBaud] = useState(460800);
    const [flashing, setFlashing] = useState(false);
    const [progress, setProgress] = useState(null);

    const refresh = async () => {
        try {
            const r = await listFirmware();
            setFiles(r.files || []);
            if (!selected && r.files?.length) setSelected(r.files[0].name);
        } catch (e) { /* ignore */ }
    };
    const pollStatus = async () => {
        try {
            const s = await getFirmwareStatus();
            setProgress(s);
            if (s.running) setFlashing(true);
            else setFlashing(false);
        } catch (e) { /* ignore */ }
    };
    useEffect(() => {
        refresh();
        pollStatus();
        const id = setInterval(pollStatus, 1000);
        return () => clearInterval(id);
    }, []);

    const onUpload = async (e) => {
        const file = e.target.files?.[0];
        if (!file) return;
        try {
            const r = await uploadFirmware(file);
            toast.success(t('firmware.toastUploaded', { name: r.name }));
            refresh();
            setSelected(r.name);
        } catch (err) {
            toast.error(t('firmware.toastUploadFailed'));
        }
    };

    const onFlash = async () => {
        if (!selected) return toast.error(t('firmware.toastSelectFw'));
        if (!window.confirm(t('firmware.confirmFlash', { name: selected }))) return;
        try {
            await flashFirmware({ file_name: selected, baud });
            toast.message(t('firmware.toastJobStarted'));
            setFlashing(true);
        } catch (e) {
            toast.error(e?.response?.data?.detail || t('firmware.toastJobFailed'));
        }
    };

    return (
        <div>
            <PageHeader title={t('firmware.title')} description={t('firmware.description')} />

            <Alert className="mb-6 border-[hsl(var(--telemetry-warn))]/50 bg-[hsl(var(--telemetry-warn))]/10">
                <AlertTriangle className="size-4 text-[hsl(var(--telemetry-warn))]" />
                <AlertTitle>{t('firmware.supportedTitle')}</AlertTitle>
                <AlertDescription className="text-xs">
                    <p>
                        <strong>{t('firmware.supported')}</strong>: {t('firmware.supportedList')}
                    </p>
                    <p className="mt-1">
                        <strong>{t('firmware.notSupported')}</strong>: {t('firmware.notSupportedList')}
                    </p>
                </AlertDescription>
            </Alert>

            <Alert className="mb-6 border-primary/40 bg-primary/5">
                <InfoIcon className="size-4 text-primary" />
                <AlertTitle>{t('firmware.switchTitle')}</AlertTitle>
                <AlertDescription className="text-xs">
                    <p>{t('firmware.switchIntro')}</p>
                    <ul className="mt-1 ml-5 list-disc space-y-0.5">
                        <li>{t('firmware.switchCenter')}</li>
                        <li>{t('firmware.switchD5')}</li>
                        <li>{t('firmware.switchD3')}</li>
                    </ul>
                    <p className="mt-1">{t('firmware.switchHow')}</p>
                </AlertDescription>
            </Alert>

            <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
                <Card className="xl:col-span-6 bg-card/60">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <UploadCloud className="size-4 text-primary" /> {t('firmware.uploadTitle')}
                        </CardTitle>
                        <CardDescription>{t('firmware.uploadDesc')}</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-3">
                        <input
                            ref={fileRef}
                            type="file"
                            accept=".bin,.hex"
                            onChange={onUpload}
                            className="hidden"
                            data-testid="firmware-file-input"
                        />
                        <Button variant="secondary" onClick={() => fileRef.current?.click()} data-testid="firmware-upload-button">
                            <UploadCloud className="size-4 mr-2" /> {t('firmware.chooseFile')}
                        </Button>
                        <div className="text-xs text-muted-foreground">{t('firmware.stagedHint')}</div>
                        <ul className="text-xs space-y-1 mt-2 max-h-48 overflow-auto" data-testid="firmware-file-list">
                            {files.map((f) => (
                                <li key={f.path} className="flex items-center gap-2 font-mono">
                                    <FileBox className="size-3 text-muted-foreground" />
                                    <span className="truncate">{f.name}</span>
                                    <span className="text-muted-foreground ml-auto">{(f.size_bytes / 1024).toFixed(1)} KB</span>
                                </li>
                            ))}
                            {files.length === 0 && <li className="text-muted-foreground">{t('firmware.noFirmware')}</li>}
                        </ul>
                    </CardContent>
                </Card>

                <Card className="xl:col-span-6 bg-card/60">
                    <CardHeader>
                        <CardTitle>{t('firmware.flashTitle')}</CardTitle>
                        <CardDescription>{t('firmware.flashDesc')}</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-3">
                        <div className="space-y-1.5">
                            <label className="text-xs text-muted-foreground">{t('firmware.firmwareFile')}</label>
                            <Select value={selected} onValueChange={setSelected}>
                                <SelectTrigger data-testid="firmware-select">
                                    <SelectValue placeholder="..." />
                                </SelectTrigger>
                                <SelectContent>
                                    {files.map((f) => (
                                        <SelectItem key={f.path} value={f.name}>
                                            {f.name}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-1.5">
                            <label className="text-xs text-muted-foreground">{t('firmware.flashBaud')}</label>
                            <Select value={String(baud)} onValueChange={(v) => setBaud(Number(v))}>
                                <SelectTrigger data-testid="flash-baud-select">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    {BAUDS.map((b) => (
                                        <SelectItem key={b} value={String(b)}>{b}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        <Button
                            onClick={onFlash}
                            disabled={!selected || !status.connected || flashing}
                            data-testid="firmware-flash-button"
                        >
                            {flashing ? <Loader2 className="size-4 mr-2 animate-spin" /> : <ZapOff className="size-4 mr-2" />}
                            {t('firmware.startFlash')}
                        </Button>
                        {progress && (progress.running || progress.stage !== 'idle') && (
                            <div className="space-y-2">
                                <div className="flex items-center justify-between text-xs">
                                    <span className="text-muted-foreground uppercase tracking-wide">{progress.stage}</span>
                                    <span className="font-mono">{progress.progress ?? 0}%</span>
                                </div>
                                <Progress value={progress.progress ?? 0} />
                                <pre className="font-mono text-[10px] whitespace-pre-wrap break-words bg-secondary/50 rounded p-2 border border-border max-h-48 overflow-auto">
                                    {progress.log}
                                </pre>
                            </div>
                        )}
                    </CardContent>
                </Card>

                <div className="xl:col-span-12">
                    <GitHubReleasesCard onDownloaded={() => refresh()} />
                </div>
            </div>
        </div>
    );
}
