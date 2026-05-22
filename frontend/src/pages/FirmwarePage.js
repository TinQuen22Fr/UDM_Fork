import React, { useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { UploadCloud, Loader2, FileBox, ZapOff, AlertTriangle, Info as InfoIcon } from 'lucide-react';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { PageHeader } from '@/components/PageHeader';
import { flashFirmware, getFirmwareStatus, listFirmware, uploadFirmware } from '@/lib/api';
import { useDevice } from '@/context/DeviceContext';

const BAUDS = [115200, 230400, 460800, 921600];

export default function FirmwarePage() {
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
            toast.success(`Uploaded ${r.name}`);
            refresh();
            setSelected(r.name);
        } catch (err) {
            toast.error('Upload failed');
        }
    };

    const onFlash = async () => {
        if (!selected) return toast.error('Select a firmware file');
        if (!window.confirm(`Flash ${selected} via esptool to the connected port?`)) return;
        try {
            await flashFirmware({ file_name: selected, baud });
            toast.message('Flash job started');
            setFlashing(true);
        } catch (e) {
            toast.error(e?.response?.data?.detail || 'Flash failed to start');
        }
    };

    return (
        <div>
            <PageHeader
                title="Firmware (DIY SQM only)"
                description="Flash ESP8266 / ESP32 firmware on a DIY SQM via esptool. Official Unihedron SQM-LU/LE/DL devices use a different (PIC) firmware procedure that is not yet supported here."
            />

            <Alert className="mb-6 border-[hsl(var(--telemetry-warn))]/50 bg-[hsl(var(--telemetry-warn))]/10">
                <AlertTriangle className="size-4 text-[hsl(var(--telemetry-warn))]" />
                <AlertTitle>Supported targets</AlertTitle>
                <AlertDescription className="text-xs">
                    <p>
                        <strong>Supported</strong>: DIY SQM ESP8266 NodeMCU (CH340), ESP32 / ESP8266 boards (CP210x, PL2303). Uses <code>esptool</code> to write a <code>.bin</code> file at offset <code>0x0</code>.
                    </p>
                    <p className="mt-1">
                        <strong>Not supported (yet)</strong>: official Unihedron SQM-LU / SQM-LE / SQM-LU-DL. Their PIC firmware uses the proprietary HEX-over-serial bootloader (<span className="font-mono">x4x5x6x</span>) which requires a different implementation — coming on the roadmap.
                    </p>
                </AlertDescription>
            </Alert>

            <Alert className="mb-6 border-primary/40 bg-primary/5">
                <InfoIcon className="size-4 text-primary" />
                <AlertTitle>DIY SQM — 3-position front switch (e.g. SQM Pro ESP8266)</AlertTitle>
                <AlertDescription className="text-xs">
                    <p>
                        Many ESP8266-based DIY SQM PCBs (including <a href="https://github.com/TinQuen22Fr/SQM-Pro-ESP8266" target="_blank" rel="noreferrer" className="text-primary hover:underline">SQM Pro</a>) use a 3-position center-off SPDT switch:
                    </p>
                    <ul className="mt-1 ml-5 list-disc space-y-0.5">
                        <li><strong>Center</strong> — normal Wi-Fi mode (default, pushes data to dashboard)</li>
                        <li><strong>D5 / GPIO14</strong> — Unihedron USB mode (answers <code>ix</code>, <code>rx</code>, <code>cx</code>… serial commands — connect via Find USB)</li>
                        <li><strong>D3 / GPIO0</strong> — Flash boot mode (ESP8266 bootloader — only this position works for re-flashing)</li>
                    </ul>
                    <p className="mt-1">
                        To flash: set the switch to the <strong>D3 (Flash boot)</strong> position, replug or press <strong>RST</strong>, then press <strong>Start flash</strong> below.
                        Set it back to <strong>D5 (Unihedron USB)</strong> to talk to UDM Fork, or <strong>Center</strong> for normal Wi-Fi operation.
                    </p>
                </AlertDescription>
            </Alert>

            <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
                <Card className="xl:col-span-6 bg-card/60">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <UploadCloud className="size-4 text-primary" /> Upload firmware
                        </CardTitle>
                        <CardDescription>Drop a .bin or .hex file to stage it for flashing.</CardDescription>
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
                            <UploadCloud className="size-4 mr-2" /> Choose file
                        </Button>
                        <div className="text-xs text-muted-foreground">
                            Staged files are kept under <span className="font-mono">SQM_FIRMWARE_DIR</span>.
                        </div>
                        <ul className="text-xs space-y-1 mt-2 max-h-48 overflow-auto" data-testid="firmware-file-list">
                            {files.map((f) => (
                                <li key={f.path} className="flex items-center gap-2 font-mono">
                                    <FileBox className="size-3 text-muted-foreground" />
                                    <span className="truncate">{f.name}</span>
                                    <span className="text-muted-foreground ml-auto">{(f.size_bytes / 1024).toFixed(1)} KB</span>
                                </li>
                            ))}
                            {files.length === 0 && <li className="text-muted-foreground">No firmware files uploaded.</li>}
                        </ul>
                    </CardContent>
                </Card>

                <Card className="xl:col-span-6 bg-card/60">
                    <CardHeader>
                        <CardTitle>Flash to device</CardTitle>
                        <CardDescription>
                            Targets the currently-connected port. The serial connection will be closed first.
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-3">
                        <div className="space-y-1.5">
                            <label className="text-xs text-muted-foreground">Firmware file</label>
                            <Select value={selected} onValueChange={setSelected}>
                                <SelectTrigger data-testid="firmware-select">
                                    <SelectValue placeholder="Choose..." />
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
                            <label className="text-xs text-muted-foreground">Flash baud</label>
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
                            Start flash
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
            </div>
        </div>
    );
}
