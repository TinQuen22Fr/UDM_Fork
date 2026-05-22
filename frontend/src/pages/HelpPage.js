import React from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { PageHeader } from '@/components/PageHeader';
import { ExternalLink, Github } from 'lucide-react';
import { useI18n } from '@/context/I18nContext';

export default function HelpPage() {
    const { t } = useI18n();
    return (
        <div>
            <PageHeader title={t('help.title')} description={t('help.description')} />

            <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
                <Card className="xl:col-span-7 bg-card/60">
                    <CardHeader>
                        <CardTitle>{t('help.aboutFork')}</CardTitle>
                        <CardDescription>{t('help.aboutForkDesc')}</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-3 text-sm">
                        <p>{t('help.aboutP1')}</p>
                        <p>{t('help.aboutP2')}</p>
                        <p>{t('help.aboutP3')}</p>
                        <div className="flex flex-wrap gap-3 pt-2">
                            <a
                                className="inline-flex items-center gap-1.5 text-primary hover:underline"
                                href="https://unihedron.com/projects/sqm-lu/"
                                target="_blank"
                                rel="noreferrer"
                            >
                                {t('help.unihedronDocs')} <ExternalLink className="size-3.5" />
                            </a>
                            <a
                                className="inline-flex items-center gap-1.5 text-primary hover:underline"
                                href="https://github.com/TinQuen22Fr/UDM_Fork"
                                target="_blank"
                                rel="noreferrer"
                            >
                                {t('help.pushToGithub')} <Github className="size-3.5" />
                            </a>
                        </div>
                    </CardContent>
                </Card>

                <Card className="xl:col-span-5 bg-card/60">
                    <CardHeader>
                        <CardTitle>{t('help.supportedAdapters')}</CardTitle>
                        <CardDescription>{t('help.supportedAdaptersDesc')}</CardDescription>
                    </CardHeader>
                    <CardContent className="text-sm font-mono">
                        <ul className="space-y-1">
                            <li>0403:6001 — FTDI FT232R (SQM-LU)</li>
                            <li>0403:6015 — FTDI FT-X (recent SQM-LU)</li>
                            <li>1A86:7523 — CH340 (DIY SQM ESP8266 NodeMCU)</li>
                            <li>1A86:5523 — CH341 (DIY)</li>
                            <li>10C4:EA60 — CP2102 (DIY ESP)</li>
                            <li>067B:2303 — PL2303 (DIY)</li>
                        </ul>
                    </CardContent>
                </Card>

                <Card className="xl:col-span-12 bg-card/60">
                    <CardHeader>
                        <CardTitle>{t('help.sqmProFwTitle')}</CardTitle>
                        <CardDescription>{t('help.sqmProFwDesc')}</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-3 text-sm">
                        <p>{t('help.sqmProFwIntro')}</p>
                        <ul className="space-y-1 font-mono text-xs">
                            <li>
                                <a className="text-primary hover:underline inline-flex items-center gap-1"
                                   href="https://github.com/TinQuen22Fr/SQM-Pro-ESP8266"
                                   target="_blank" rel="noreferrer">
                                    github.com/TinQuen22Fr/SQM-Pro-ESP8266 (main) <ExternalLink className="size-3.5" />
                                </a>
                            </li>
                            <li>
                                <a className="text-primary hover:underline inline-flex items-center gap-1"
                                   href="https://github.com/TinQuen22Fr/SQM-Pro-ESP8266/tree/wifimanager"
                                   target="_blank" rel="noreferrer">
                                    .../tree/wifimanager (beta) <ExternalLink className="size-3.5" />
                                </a>
                            </li>
                            <li>
                                <a className="text-primary hover:underline inline-flex items-center gap-1"
                                   href="https://github.com/TinQuen22Fr/SQM-Pro-ESP8266/releases"
                                   target="_blank" rel="noreferrer">
                                    .../releases (.bin) <ExternalLink className="size-3.5" />
                                </a>
                            </li>
                            <li>
                                <a className="text-primary hover:underline inline-flex items-center gap-1"
                                   href="https://sqm.quentin-astro.fr/"
                                   target="_blank" rel="noreferrer">
                                    sqm.quentin-astro.fr (dashboard) <ExternalLink className="size-3.5" />
                                </a>
                            </li>
                        </ul>
                        <p className="text-xs text-muted-foreground">{t('help.sqmProHardware')}</p>
                    </CardContent>
                </Card>

                <Card className="xl:col-span-12 bg-card/60">
                    <CardHeader>
                        <CardTitle>{t('help.linuxTrouble')}</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <Accordion type="single" collapsible className="w-full">
                            <AccordionItem value="dialout">
                                <AccordionTrigger>{t('help.q1')}</AccordionTrigger>
                                <AccordionContent>
                                    {t('help.a1')}
                                    <pre className="font-mono text-xs mt-2 bg-secondary/50 rounded p-2 border border-border">
{`sudo usermod -aG dialout $USER
# Then log out and back in`}
                                    </pre>
                                </AccordionContent>
                            </AccordionItem>
                            <AccordionItem value="udev">
                                <AccordionTrigger>{t('help.q2')}</AccordionTrigger>
                                <AccordionContent>
                                    {t('help.a2')}
                                    <pre className="font-mono text-xs mt-2 bg-secondary/50 rounded p-2 border border-border">
{`sudo cp scripts/99-sqm.rules /etc/udev/rules.d/
sudo udevadm control --reload-rules && sudo udevadm trigger`}
                                    </pre>
                                </AccordionContent>
                            </AccordionItem>
                            <AccordionItem value="modemmanager">
                                <AccordionTrigger>{t('help.q3')}</AccordionTrigger>
                                <AccordionContent>
                                    {t('help.a3')}
                                    <pre className="font-mono text-xs mt-2 bg-secondary/50 rounded p-2 border border-border">
{`sudo systemctl disable --now ModemManager.service`}
                                    </pre>
                                </AccordionContent>
                            </AccordionItem>
                            <AccordionItem value="esptool">
                                <AccordionTrigger>{t('help.q4')}</AccordionTrigger>
                                <AccordionContent>{t('help.a4')}</AccordionContent>
                            </AccordionItem>
                        </Accordion>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
