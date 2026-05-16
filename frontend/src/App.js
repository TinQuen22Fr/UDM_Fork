import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import '@/App.css';
import { Toaster } from '@/components/ui/sonner';
import { AppShell } from '@/components/layout/AppShell';
import { DeviceProvider } from '@/context/DeviceContext';
import ConnectionPage from '@/pages/ConnectionPage';
import InformationPage from '@/pages/InformationPage';
import ReadingsPage from '@/pages/ReadingsPage';
import LoggingPage from '@/pages/LoggingPage';
import ChartsPage from '@/pages/ChartsPage';
import ConfigurationPage from '@/pages/ConfigurationPage';
import FirmwarePage from '@/pages/FirmwarePage';
import ConsolePage from '@/pages/ConsolePage';
import HelpPage from '@/pages/HelpPage';

function App() {
    return (
        <div className="app-root dark">
            <DeviceProvider>
                <BrowserRouter>
                    <AppShell>
                        <Routes>
                            <Route path="/" element={<Navigate to="/connection" replace />} />
                            <Route path="/connection" element={<ConnectionPage />} />
                            <Route path="/information" element={<InformationPage />} />
                            <Route path="/readings" element={<ReadingsPage />} />
                            <Route path="/logging" element={<LoggingPage />} />
                            <Route path="/charts" element={<ChartsPage />} />
                            <Route path="/configuration" element={<ConfigurationPage />} />
                            <Route path="/firmware" element={<FirmwarePage />} />
                            <Route path="/console" element={<ConsolePage />} />
                            <Route path="/help" element={<HelpPage />} />
                            <Route path="*" element={<Navigate to="/connection" replace />} />
                        </Routes>
                    </AppShell>
                </BrowserRouter>
                <Toaster richColors closeButton position="bottom-right" theme="dark" />
            </DeviceProvider>
        </div>
    );
}

export default App;
