import React, { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Loader2, FileBox, Save } from 'lucide-react';
import { getLogMetadata, setLogMetadata } from '@/lib/api';
import { useI18n } from '@/context/I18nContext';

const FIELDS = [
    ['instrument_id', 'Instrument ID', 'SQM-LU-1234'],
    ['data_supplier', 'Data supplier', 'Your name'],
    ['location_name', 'Location name', 'Backyard observatory'],
    ['position', 'Position (lat, lon, elev m)', '45.123, 3.456, 300'],
    ['local_timezone', 'Local timezone', 'Europe/Paris'],
    ['time_sync', 'Time synchronization', 'NTP'],
    ['moving_stationary_position', 'Moving/Stationary', 'STATIONARY'],
    ['moving_fixed_direction', 'Moving/Fixed direction', 'FIXED'],
    ['filters_per_channel', 'Filters per channel', 'HOYA CM-500'],
    ['measurement_direction_per_channel', 'Measurement direction', '0z, 0az'],
];

export function DLHeaderForm() {
    const { t } = useI18n();
    const [data, setData] = useState({
        instrument_id: '', data_supplier: '', location_name: '', position: '',
        local_timezone: '', time_sync: '', moving_stationary_position: 'STATIONARY',
        moving_fixed_direction: 'FIXED', number_of_channels: 1,
        filters_per_channel: 'HOYA CM-500', measurement_direction_per_channel: '0z, 0az',
        field_of_view_degrees: 20, cover_offset_value: 0, comments: ['', '', '', '', ''],
    });
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        (async () => {
            try {
                const m = await getLogMetadata();
                setData((d) => ({ ...d, ...m, comments: m.comments || ['', '', '', '', ''] }));
            } catch (e) { /* ignore */ }
        })();
    }, []);

    const update = (key, value) => setData((d) => ({ ...d, [key]: value }));
    const updateComment = (i, v) => setData((d) => {
        const c = [...(d.comments || [])];
        c[i] = v;
        return { ...d, comments: c };
    });

    const onSave = async () => {
        setSaving(true);
        try {
            await setLogMetadata({
                ...data,
                number_of_channels: Number(data.number_of_channels) || 1,
                field_of_view_degrees: Number(data.field_of_view_degrees) || 20,
                cover_offset_value: Number(data.cover_offset_value) || 0,
            });
            toast.success(t('toasts.success'));
        } catch (e) {
            toast.error(t('toasts.error'));
        } finally {
            setSaving(false);
        }
    };

    return (
        <Card className="bg-card/60">
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    <FileBox className="size-4 text-primary" /> DL Header (DAT metadata)
                </CardTitle>
                <CardDescription>
                    Metadata written into the canonical Unihedron <span className="font-mono">.dat</span> file header
                    (Light Pollution Monitoring Data Format 1.0 — darksky.org). Required for darksky-compatible submissions.
                </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {FIELDS.map(([key, label, placeholder]) => (
                        <div key={key} className="space-y-1">
                            <label className="text-[11px] text-muted-foreground">{label}</label>
                            <Input
                                value={data[key] ?? ''}
                                placeholder={placeholder}
                                onChange={(e) => update(key, e.target.value)}
                                data-testid={`metadata-${key}`}
                            />
                        </div>
                    ))}
                    <div className="space-y-1">
                        <label className="text-[11px] text-muted-foreground">Number of channels</label>
                        <Input type="number" min={1} value={data.number_of_channels} onChange={(e) => update('number_of_channels', e.target.value)} data-testid="metadata-channels" />
                    </div>
                    <div className="space-y-1">
                        <label className="text-[11px] text-muted-foreground">Field of view (degrees)</label>
                        <Input type="number" step="0.1" value={data.field_of_view_degrees} onChange={(e) => update('field_of_view_degrees', e.target.value)} data-testid="metadata-fov" />
                    </div>
                    <div className="space-y-1">
                        <label className="text-[11px] text-muted-foreground">Cover offset value</label>
                        <Input type="number" step="0.01" value={data.cover_offset_value} onChange={(e) => update('cover_offset_value', e.target.value)} data-testid="metadata-cover" />
                    </div>
                </div>
                <div className="space-y-1.5 pt-2">
                    <label className="text-[11px] text-muted-foreground">Comments (up to 5 lines)</label>
                    {(data.comments || ['', '', '', '', '']).slice(0, 5).map((c, i) => (
                        <Input
                            key={i}
                            value={c || ''}
                            placeholder={`Comment ${i + 1}`}
                            onChange={(e) => updateComment(i, e.target.value)}
                            data-testid={`metadata-comment-${i}`}
                        />
                    ))}
                </div>
                <Button onClick={onSave} disabled={saving} data-testid="save-metadata-button">
                    {saving ? <Loader2 className="size-4 mr-2 animate-spin" /> : <Save className="size-4 mr-2" />}
                    Save metadata
                </Button>
            </CardContent>
        </Card>
    );
}
