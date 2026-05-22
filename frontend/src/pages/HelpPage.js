import React from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { PageHeader } from '@/components/PageHeader';
import { ExternalLink, Github } from 'lucide-react';

export default function HelpPage() {
    return (
        <div>
            <PageHeader
                title="Help & Troubleshooting"
                description="Quick reference for the UDM Fork, supported devices and Linux setup."
            />

            <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
                <Card className="xl:col-span-7 bg-card/60">
                    <CardHeader>
                        <CardTitle>About this fork</CardTitle>
                        <CardDescription>Modern web UI replacing the original UDM tkinter app.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-3 text-sm">
                        <p>
                            <strong>UDM Fork</strong> is an open-source rewrite of the Unihedron Device Manager (UDM)
                            for the Sky Quality Meter, with one key addition: <em>USB discovery now also recognises
                            DIY SQM devices based on the ESP8266 NodeMCU (CH340 driver)</em>.
                        </p>
                        <p>
                            It speaks the Unihedron serial protocol (115200 8N1, commands <code className="font-mono">ix</code>, <code className="font-mono">rx</code>, <code className="font-mono">ux</code>, <code className="font-mono">cx</code>, <code className="font-mono">Lxxxxxxxxx</code>, <code className="font-mono">zcalAx</code>, etc.).
                        </p>
                        <p>
                            Tech stack: FastAPI (backend) + React (frontend) + MongoDB (optional, for preferences).
                        </p>
                        <div className="flex flex-wrap gap-3 pt-2">
                            <a
                                className="inline-flex items-center gap-1.5 text-primary hover:underline"
                                href="https://unihedron.com/projects/sqm-lu/"
                                target="_blank"
                                rel="noreferrer"
                            >
                                Unihedron SQM-LU docs <ExternalLink className="size-3.5" />
                            </a>
                            <a
                                className="inline-flex items-center gap-1.5 text-primary hover:underline"
                                href="https://github.com/"
                                target="_blank"
                                rel="noreferrer"
                            >
                                Push this fork to GitHub <Github className="size-3.5" />
                            </a>
                        </div>
                    </CardContent>
                </Card>

                <Card className="xl:col-span-5 bg-card/60">
                    <CardHeader>
                        <CardTitle>Supported USB adapters</CardTitle>
                        <CardDescription>Detected by VID/PID and shown in the Find USB panel.</CardDescription>
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
                        <CardTitle>DIY SQM firmware — SQM Pro (ESP8266)</CardTitle>
                        <CardDescription>
                            Open-source firmware that pairs with this UDM Fork over the Unihedron-compatible serial protocol.
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-3 text-sm">
                        <p>
                            If you're looking for a tested DIY firmware that works out of the box with UDM Fork
                            (CH340 detection, <code>ix</code>/<code>rx</code>/<code>cx</code>/<code>w</code>/<code>g</code> commands,
                            TSL2591 light sensor, BME280 weather, OLED, optional GPS NEO-6, OTA, deep-sleep, Wi-Fi push),
                            have a look at <strong>SQM Pro</strong> by Quentin Dumont:
                        </p>
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
                                    .../tree/wifimanager (beta with captive portal) <ExternalLink className="size-3.5" />
                                </a>
                            </li>
                            <li>
                                <a className="text-primary hover:underline inline-flex items-center gap-1"
                                   href="https://github.com/TinQuen22Fr/SQM-Pro-ESP8266/releases"
                                   target="_blank" rel="noreferrer">
                                    .../releases (pre-built .bin files for the Firmware page) <ExternalLink className="size-3.5" />
                                </a>
                            </li>
                            <li>
                                <a className="text-primary hover:underline inline-flex items-center gap-1"
                                   href="https://sqm.quentin-astro.fr/"
                                   target="_blank" rel="noreferrer">
                                    sqm.quentin-astro.fr (companion Wi-Fi dashboard) <ExternalLink className="size-3.5" />
                                </a>
                            </li>
                        </ul>
                        <p className="text-xs text-muted-foreground">
                            Hardware: ESP8266 NodeMCU + Adafruit TSL2591 + BME280 + SH1106/SSD1306 OLED + optional u-blox NEO-6M GPS. Baud rate 115200 (SQM-LU compatible since firmware v2.2.4).
                        </p>
                    </CardContent>
                </Card>

                <Card className="xl:col-span-12 bg-card/60">
                    <CardHeader>
                        <CardTitle>Linux troubleshooting</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <Accordion type="single" collapsible className="w-full">
                            <AccordionItem value="dialout">
                                <AccordionTrigger>I can&apos;t open the serial port (Permission denied)</AccordionTrigger>
                                <AccordionContent>
                                    Add your user to the <code className="font-mono">dialout</code> group:
                                    <pre className="font-mono text-xs mt-2 bg-secondary/50 rounded p-2 border border-border">
{`sudo usermod -aG dialout $USER
# Then log out and back in`}
                                    </pre>
                                </AccordionContent>
                            </AccordionItem>
                            <AccordionItem value="udev">
                                <AccordionTrigger>CH340 not detected or detected as ttyUSB but unreachable</AccordionTrigger>
                                <AccordionContent>
                                    Install the bundled udev rules:
                                    <pre className="font-mono text-xs mt-2 bg-secondary/50 rounded p-2 border border-border">
{`sudo cp scripts/99-sqm.rules /etc/udev/rules.d/
sudo udevadm control --reload-rules && sudo udevadm trigger`}
                                    </pre>
                                </AccordionContent>
                            </AccordionItem>
                            <AccordionItem value="modemmanager">
                                <AccordionTrigger>ModemManager keeps grabbing my serial port</AccordionTrigger>
                                <AccordionContent>
                                    Disable it (it interferes with SQM/ESP8266 serial):
                                    <pre className="font-mono text-xs mt-2 bg-secondary/50 rounded p-2 border border-border">
{`sudo systemctl disable --now ModemManager.service`}
                                    </pre>
                                </AccordionContent>
                            </AccordionItem>
                            <AccordionItem value="esptool">
                                <AccordionTrigger>Firmware flashing fails</AccordionTrigger>
                                <AccordionContent>
                                    Install esptool: <code className="font-mono">pip install esptool</code>.
                                    Then ensure your DIY SQM is in bootloader mode (some boards need GPIO0 held to GND on reset).
                                </AccordionContent>
                            </AccordionItem>
                        </Accordion>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
