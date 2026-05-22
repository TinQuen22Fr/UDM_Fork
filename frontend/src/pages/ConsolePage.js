import React, { useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Send, Eraser, Terminal as TerminalIcon } from 'lucide-react';
import { PageHeader } from '@/components/PageHeader';
import { sendRawCommand } from '@/lib/api';
import { useDevice } from '@/context/DeviceContext';
import { useI18n } from '@/context/I18nContext';

const PRESETS = ['ix', 'rx', 'ux', 'cx', 'Ix'];

export default function ConsolePage() {
    const { t } = useI18n();
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
        if (!status.connected) return toast.error(t('console.toastConnect'));
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
                title={t('console.title')}
                description={t('console.description')}
                actions={
                    <Button variant="ghost" onClick={() => setLines([])} data-testid="console-clear-button">
                        <Eraser className="size-4 mr-2" /> {t('common.clear')}
                    </Button>
                }
            />

            <Card className="bg-card/60">
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <TerminalIcon className="size-4 text-primary" /> {t('console.serialTerminal')}
                    </CardTitle>
                    <CardDescription>{t('console.serialTerminalDesc')}</CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="flex gap-2 flex-wrap mb-3">
                        {PRESETS.map((p) => (
                            <Button
                                key={p}
                                size="sm"
                                variant="secondary"
                                onClick={() => send(p)}
                                disabled={busy || !status.connected}
                                data-testid={`preset-${p}`}
                            >
                                {t(`console.preset.${p}`)}
                            </Button>
                        ))}
                    </div>
                    <div className="rounded-lg border border-border bg-background/60 p-3 h-[420px] overflow-auto font-mono text-xs" data-testid="console-output">
                        {lines.length === 0 && (
                            <p className="text-muted-foreground">{t('console.noIO')}</p>
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
                            placeholder={t('console.typeCommand')}
                            value={cmd}
                            onChange={(e) => setCmd(e.target.value)}
                            className="font-mono"
                            data-testid="console-input"
                            disabled={busy || !status.connected}
                        />
                        <Button type="submit" disabled={busy || !cmd || !status.connected} data-testid="console-send-button">
                            <Send className="size-4 mr-2" /> {t('common.send')}
                        </Button>
                    </form>
                </CardContent>
            </Card>
        </div>
    );
}
