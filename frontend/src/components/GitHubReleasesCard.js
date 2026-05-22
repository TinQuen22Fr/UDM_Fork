import React, { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Loader2, Github, Download, Tag, Calendar, RefreshCw, FileBox } from 'lucide-react';
import { downloadFirmwareRelease, fetchFirmwareReleases } from '@/lib/api';

const DEFAULT_REPO = 'TinQuen22Fr/SQM-Pro-ESP8266';

export function GitHubReleasesCard({ onDownloaded }) {
    const [releases, setReleases] = useState([]);
    const [loading, setLoading] = useState(false);
    const [repo, setRepo] = useState(DEFAULT_REPO);
    const [downloadingUrl, setDownloadingUrl] = useState('');

    const refresh = async () => {
        setLoading(true);
        try {
            const r = await fetchFirmwareReleases(repo);
            setReleases(r.releases || []);
        } catch (e) {
            toast.error(e?.response?.data?.detail || 'Failed to fetch releases');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        refresh();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const download = async (asset) => {
        if (!asset?.download_url) return;
        setDownloadingUrl(asset.download_url);
        try {
            const r = await downloadFirmwareRelease(asset.download_url, asset.name);
            toast.success(`Downloaded ${r.name} (${(r.size_bytes / 1024).toFixed(1)} KB)`);
            onDownloaded?.(r);
        } catch (e) {
            toast.error(e?.response?.data?.detail || 'Download failed');
        } finally {
            setDownloadingUrl('');
        }
    };

    return (
        <Card className="bg-card/60">
            <CardHeader className="flex flex-row items-center justify-between">
                <div>
                    <CardTitle className="flex items-center gap-2">
                        <Github className="size-4 text-primary" /> GitHub Releases
                    </CardTitle>
                    <CardDescription className="text-xs">
                        Pre-built firmware <code>.bin</code> from <span className="font-mono">{repo}</span>. Pick a release → Download → it appears in the firmware list above and is ready to Start flash.
                    </CardDescription>
                </div>
                <Button size="sm" variant="secondary" onClick={refresh} disabled={loading} data-testid="releases-refresh-button">
                    {loading ? <Loader2 className="size-3.5 mr-2 animate-spin" /> : <RefreshCw className="size-3.5 mr-2" />}
                    Refresh
                </Button>
            </CardHeader>
            <CardContent className="space-y-2">
                {releases.length === 0 && !loading && (
                    <p className="text-xs text-muted-foreground">No releases found (or rate-limited by GitHub).</p>
                )}
                {releases.map((rel) => (
                    <div
                        key={rel.tag_name + rel.html_url}
                        className="rounded-lg border border-border p-3 space-y-2"
                        data-testid={`release-${rel.tag_name}`}
                    >
                        <div className="flex items-center gap-2 flex-wrap">
                            <Tag className="size-3.5 text-muted-foreground" />
                            <span className="font-mono text-sm font-semibold">{rel.tag_name}</span>
                            {rel.name && rel.name !== rel.tag_name && (
                                <span className="text-xs text-muted-foreground">{rel.name}</span>
                            )}
                            {rel.prerelease && (
                                <Badge variant="outline" className="text-[10px] uppercase">
                                    Pre-release
                                </Badge>
                            )}
                            <div className="ml-auto flex items-center gap-1 text-[11px] text-muted-foreground">
                                <Calendar className="size-3" />
                                {rel.published_at ? new Date(rel.published_at).toLocaleDateString() : ''}
                            </div>
                        </div>
                        {rel.assets.length === 0 && (
                            <p className="text-[11px] text-muted-foreground">No .bin asset attached.</p>
                        )}
                        {rel.assets.map((a) => (
                            <div key={a.download_url} className="flex items-center gap-2 text-xs">
                                <FileBox className="size-3 text-muted-foreground" />
                                <span className="font-mono truncate flex-1">{a.name}</span>
                                <span className="text-muted-foreground">{(a.size_bytes / 1024).toFixed(1)} KB</span>
                                <Button
                                    size="sm"
                                    variant="secondary"
                                    onClick={() => download(a)}
                                    disabled={!!downloadingUrl}
                                    data-testid={`release-download-${rel.tag_name}-${a.name}`}
                                >
                                    {downloadingUrl === a.download_url ? (
                                        <Loader2 className="size-3 mr-1.5 animate-spin" />
                                    ) : (
                                        <Download className="size-3 mr-1.5" />
                                    )}
                                    Download
                                </Button>
                            </div>
                        ))}
                        {rel.body && (
                            <details className="text-[11px] text-muted-foreground">
                                <summary className="cursor-pointer">Changelog</summary>
                                <pre className="mt-1 font-mono whitespace-pre-wrap break-words">
                                    {rel.body.slice(0, 1200)}
                                </pre>
                            </details>
                        )}
                    </div>
                ))}
            </CardContent>
        </Card>
    );
}
