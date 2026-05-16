import React, { useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Send, Eraser, Terminal as TerminalIcon } from 'lucide-react';
import { PageHeader } from '@/components/PageHeader';
import { sendRawCommand } from '@/lib/api';
import { useDevice } from '@/context/DeviceContext';

const PRESETS = [
    { label: 'ix - Info', cmd: 'ix' },
    { label: 'rx - Reading', cmd: 'rx' },
    { label: 'ux - Un-averaged', cmd: 'ux' },
    { label: 'cx - Calibration', cmd: 'cx' },
    { label: 'Ix - Get interval', cmd: 'Ix' },
];

export default function ConsolePage() {
    const { status } = useDevice();
    const [lines, setLines] = useState([]);
    const [cmd, setCmd] = useState('');
    const [busy, setBusy] = useState(false);
    const endRef = useRef(null);

    useEffect(() => {
        endRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [lines]);

    const send = async (c) => {
        const command = (c ?? cmd).trim();
        if (!command) return;
        if (!status.connected) return toast.error('Connect first');
        setBusy(true);
        setLines((prev) => [...prev, { kind: 'send', text: command, ts: new Date().toISOString() }]);
        try {
            const r = await sendRawCommand(command);
            setLines((prev) => [...prev, { kind: 'recv', text: r.response, ts: new Date().toISOString() }]);
            setCmd('');
        } catch (e) {
            setLines((prev) => [...prev, { kind: 'err', text: e?.response?.data?.detail || 'error', ts: new Date().toISOString() }]);
        } finally {
            setBusy(false);
        }
    };

    return (
        <div>
            <PageHeader
                title="Raw Command Console"
                description="Send arbitrary Unihedron-style commands directly to the device and view raw responses."
                actions={
                    <Button variant="ghost" onClick={() => setLines([])} data-testid="console-clear-button">
                        <Eraser className="size-4 mr-2" /> Clear
                    </Button>
                }
            />

            <Card className="bg-card/60">
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <TerminalIcon className="size-4 text-primary" /> Serial Terminal
                    </CardTitle>
                    <CardDescription>Bytes are sent verbatim (no automatic newline). Use the presets for common commands.</CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="flex gap-2 flex-wrap mb-3">
                        {PRESETS.map((p) => (
                            <Button
                                key={p.cmd}
                                size="sm"
                                variant="secondary"
                                onClick={() => send(p.cmd)}
                                disabled={busy || !status.connected}
                                data-testid={`preset-${p.cmd}`}
                            >
                                {p.label}
                            </Button>
                        ))}
                    </div>
                    <div className="rounded-lg border border-border bg-background/60 p-3 h-[420px] overflow-auto font-mono text-xs" data-testid="console-output">
                        {lines.length === 0 && (
                            <p className="text-muted-foreground">No I/O yet. Try a preset above.</p>
                        )}
                        {lines.map((l, i) => (
                            <div key={i} className="flex gap-2 items-start py-0.5">
                                <span className="text-muted-foreground tabular-nums">{new Date(l.ts).toLocaleTimeString().slice(0, 8)}</span>
                                <span
                                    className={
                                        l.kind === 'send'
                                            ? 'text-[hsl(var(--chart-1))]'
                                            : l.kind === 'recv'
                                              ? 'text-foreground'
                                              : 'text-[hsl(var(--telemetry-bad))]'
                                    }
                                >
                                    {l.kind === 'send' ? '>' : l.kind === 'recv' ? '<' : '!'}
                                </span>
                                <span className="whitespace-pre-wrap break-words">{l.text}</span>
                            </div>
                        ))}
                        <div ref={endRef} />
                    </div>
                    <form
                        className="mt-3 flex gap-2"
                        onSubmit={(e) => {
                            e.preventDefault();
                            send();
                        }}
                    >
                        <Input
                            placeholder='Type a command (e.g. "rx")'
                            value={cmd}
                            onChange={(e) => setCmd(e.target.value)}
                            className="font-mono"
                            data-testid="console-input"
                            disabled={busy || !status.connected}
                        />
                        <Button type="submit" disabled={busy || !cmd || !status.connected} data-testid="console-send-button">
                            <Send className="size-4 mr-2" /> Send
                        </Button>
                    </form>
                </CardContent>
            </Card>
        </div>
    );
}
