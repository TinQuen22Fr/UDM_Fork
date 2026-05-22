import React, { useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import {
    Activity,
    BookOpen,
    Cable,
    FileBarChart2,
    Globe,
    HelpCircle,
    Info,
    LayoutDashboard,
    Menu,
    Moon,
    Radio,
    Settings,
    Settings2,
    Sparkles,
    Sun,
    Terminal,
    UploadCloud,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { useDevice } from '@/context/DeviceContext';
import { useI18n } from '@/context/I18nContext';
import { cn } from '@/lib/utils';

const NAV_DEF = [
    { to: '/connection', key: 'connection', icon: Cable, testid: 'sidebar-connection-link' },
    { to: '/information', key: 'information', icon: Info, testid: 'sidebar-information-link' },
    { to: '/readings', key: 'readings', icon: Activity, testid: 'sidebar-readings-link' },
    { to: '/charts', key: 'charts', icon: FileBarChart2, testid: 'sidebar-charts-link' },
    { to: '/logging', key: 'logging', icon: BookOpen, testid: 'sidebar-logging-link' },
    { to: '/configuration', key: 'configuration', icon: Settings2, testid: 'sidebar-configuration-link' },
    { to: '/dashboard', key: 'dashboard', icon: LayoutDashboard, testid: 'sidebar-dashboard-link' },
    { to: '/firmware', key: 'firmware', icon: UploadCloud, testid: 'sidebar-firmware-link' },
    { to: '/console', key: 'console', icon: Terminal, testid: 'sidebar-console-link' },
    { to: '/settings', key: 'settings', icon: Settings, testid: 'sidebar-settings-link' },
    { to: '/help', key: 'help', icon: HelpCircle, testid: 'sidebar-help-link' },
];

function SidebarContent({ onNavigate }) {
    const loc = useLocation();
    const { t, lang, setLang } = useI18n();
    return (
        <div className="h-full flex flex-col">
            <div className="px-5 pt-5 pb-3 flex items-center gap-3">
                <div className="size-9 rounded-xl bg-primary/15 border border-primary/30 flex items-center justify-center">
                    <Sparkles className="size-4 text-primary" />
                </div>
                <div>
                    <div className="text-sm font-semibold tracking-tight">{t('shell.appName')}</div>
                    <div className="text-[11px] text-muted-foreground uppercase tracking-wider">{t('shell.appSubtitle')}</div>
                </div>
            </div>
            <Separator />
            <nav className="flex-1 px-3 py-4 space-y-1 overflow-auto" data-testid="sidebar-nav">
                {NAV_DEF.map((item) => {
                    const Icon = item.icon;
                    const active = loc.pathname.startsWith(item.to);
                    return (
                        <Link
                            key={item.to}
                            to={item.to}
                            data-testid={item.testid}
                            onClick={onNavigate}
                            className={cn(
                                'flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors',
                                active
                                    ? 'bg-primary/10 text-foreground border border-primary/20'
                                    : 'text-muted-foreground hover:bg-accent/60 hover:text-foreground border border-transparent'
                            )}
                        >
                            <Icon className="size-4 shrink-0" />
                            <span>{t(`nav.${item.key}`)}</span>
                        </Link>
                    );
                })}
            </nav>
            <Separator />
            <div className="px-3 py-3">
                <div className="flex items-center gap-2 px-2 py-1.5 rounded-lg border border-border bg-card/40">
                    <Globe className="size-3.5 text-muted-foreground shrink-0" />
                    <button
                        type="button"
                        onClick={() => setLang('fr')}
                        data-testid="lang-fr-button"
                        className={cn(
                            'flex-1 text-xs py-1 rounded transition-colors',
                            lang === 'fr' ? 'bg-primary/15 text-primary font-medium' : 'text-muted-foreground hover:text-foreground'
                        )}
                    >
                        FR
                    </button>
                    <button
                        type="button"
                        onClick={() => setLang('en')}
                        data-testid="lang-en-button"
                        className={cn(
                            'flex-1 text-xs py-1 rounded transition-colors',
                            lang === 'en' ? 'bg-primary/15 text-primary font-medium' : 'text-muted-foreground hover:text-foreground'
                        )}
                    >
                        EN
                    </button>
                </div>
            </div>
            <div className="px-5 pb-4 text-[11px] text-muted-foreground">
                <div className="flex items-center gap-1.5">
                    <Radio className="size-3" />
                    <span>{t('shell.protocolFooter')}</span>
                </div>
                <div className="mt-1">{t('shell.supportFooter')}</div>
            </div>
        </div>
    );
}

export function AppShell({ children }) {
    const [open, setOpen] = useState(false);
    const [nightVision, setNightVision] = useState(() => localStorage.getItem('udm.nightVision') === '1');
    const { status, wsConnected, latestReading } = useDevice();
    const { t } = useI18n();

    useEffect(() => {
        const root = document.documentElement;
        if (nightVision) root.classList.add('night-vision');
        else root.classList.remove('night-vision');
        localStorage.setItem('udm.nightVision', nightVision ? '1' : '0');
    }, [nightVision]);

    // Listen for cross-tab/component nightVision changes via storage event
    useEffect(() => {
        const handler = (e) => {
            if (e.key === 'udm.nightVision') {
                setNightVision(e.newValue === '1');
            }
        };
        window.addEventListener('storage', handler);
        // Also expose a direct event for same-tab updates
        const customHandler = (e) => setNightVision(!!e.detail);
        window.addEventListener('udm:night-vision', customHandler);
        return () => {
            window.removeEventListener('storage', handler);
            window.removeEventListener('udm:night-vision', customHandler);
        };
    }, []);

    const dotColor = status.connected
        ? 'bg-[hsl(var(--telemetry-good))]'
        : 'bg-muted-foreground/50';

    return (
        <div className="min-h-screen w-full flex text-foreground starfield-overlay">
            {/* Desktop sidebar */}
            <aside className="hidden lg:flex w-[280px] shrink-0 border-r border-border bg-card/40 backdrop-blur relative z-10">
                <SidebarContent />
            </aside>

            <div className="flex-1 min-w-0 flex flex-col relative z-10">
                {/* Topbar */}
                <header className="h-14 border-b border-border bg-card/60 backdrop-blur sticky top-0 z-20 flex items-center px-4 sm:px-6 gap-3">
                    <Sheet open={open} onOpenChange={setOpen}>
                        <SheetTrigger asChild>
                            <Button
                                variant="ghost"
                                size="icon"
                                className="lg:hidden"
                                aria-label={t('shell.openNavigation')}
                                data-testid="sidebar-toggle"
                            >
                                <Menu className="size-5" />
                            </Button>
                        </SheetTrigger>
                        <SheetContent side="left" className="p-0 w-[280px]">
                            <SidebarContent onNavigate={() => setOpen(false)} />
                        </SheetContent>
                    </Sheet>

                    <div className="flex items-center gap-2 mr-2">
                        <div className="relative size-2.5 rounded-full overflow-visible">
                            <span
                                className={cn(
                                    'absolute inset-0 rounded-full',
                                    dotColor,
                                    status.connected && 'dot-ping'
                                )}
                            />
                            <span className={cn('absolute inset-0 rounded-full', dotColor)} />
                        </div>
                        <Badge
                            variant="outline"
                            data-testid="device-status-badge"
                            className={cn(
                                'font-medium border',
                                status.connected
                                    ? 'bg-[hsl(var(--telemetry-good))]/15 text-[hsl(var(--telemetry-good))] border-[hsl(var(--telemetry-good))]/30'
                                    : 'text-muted-foreground'
                            )}
                        >
                            {status.connected ? t('common.connected') : t('common.disconnected')}
                        </Badge>
                        {status.connected && status.port && (
                            <span className="text-xs font-mono text-muted-foreground hidden sm:inline">
                                {status.port} @ {status.baudrate}
                            </span>
                        )}
                        {status.mock_mode && (
                            <Badge variant="outline" className="text-[10px] uppercase tracking-wider">
                                {t('common.demoMode')}
                            </Badge>
                        )}
                    </div>

                    <div className="ml-auto flex items-center gap-2 sm:gap-4">
                        {latestReading?.mpsas != null && (
                            <div className="hidden md:flex items-center gap-3 text-xs font-variant-numeric tabular-nums">
                                <div className="font-mono">
                                    <span className="text-muted-foreground mr-1">mpsas</span>
                                    <span className="text-foreground font-semibold inline-block min-w-[3.5ch] text-right">
                                        {latestReading.mpsas != null ? latestReading.mpsas.toFixed(2) : '—'}
                                    </span>
                                </div>
                                <div className="font-mono">
                                    <span className="text-muted-foreground mr-1">T</span>
                                    <span className="inline-block min-w-[3.5ch] text-right">
                                        {latestReading.temperature_c != null ? latestReading.temperature_c.toFixed(1) : '—'}
                                    </span>
                                    <span>°C</span>
                                </div>
                            </div>
                        )}
                        <div className="hidden sm:flex items-center gap-1.5 text-[11px] text-muted-foreground">
                            <span
                                className={cn(
                                    'size-1.5 rounded-full',
                                    wsConnected ? 'bg-[hsl(var(--telemetry-good))]' : 'bg-muted-foreground/50'
                                )}
                            />
                            WS
                        </div>
                        <div className="flex items-center gap-2">
                            {nightVision ? (
                                <Moon className="size-3.5 text-[hsl(var(--primary))]" />
                            ) : (
                                <Sun className="size-3.5 text-muted-foreground" />
                            )}
                            <Switch
                                checked={nightVision}
                                onCheckedChange={setNightVision}
                                aria-label={t('shell.nightVision')}
                                data-testid="night-vision-toggle"
                            />
                            <span className="text-xs text-muted-foreground hidden sm:inline">{t('shell.night')}</span>
                        </div>
                    </div>
                </header>

                <main className="flex-1 min-h-0 px-4 sm:px-6 lg:px-8 py-6">{children}</main>
            </div>
        </div>
    );
}
