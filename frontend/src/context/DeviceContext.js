import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { buildTelemetryWsUrl, getDeviceStatus } from '@/lib/api';

const DeviceContext = createContext(null);

export const useDevice = () => {
    const ctx = useContext(DeviceContext);
    if (!ctx) throw new Error('useDevice must be used within DeviceProvider');
    return ctx;
};

const MAX_HISTORY = 600; // 10 minutes @ 1Hz

export const DeviceProvider = ({ children }) => {
    const [status, setStatus] = useState({ connected: false, mock_mode: false });
    const [info, setInfo] = useState(null);
    const [latestReading, setLatestReading] = useState(null);
    const [history, setHistory] = useState([]); // [{ts, mpsas, temp, freq, counts}]
    const [loggingSession, setLoggingSession] = useState(null);
    const [wsConnected, setWsConnected] = useState(false);
    const wsRef = useRef(null);

    const refreshStatus = useCallback(async () => {
        try {
            const s = await getDeviceStatus();
            setStatus(s);
            return s;
        } catch (e) {
            console.warn('status refresh failed', e);
            return null;
        }
    }, []);

    // WebSocket
    useEffect(() => {
        let stopped = false;
        let retry = 0;
        const connect = () => {
            try {
                const ws = new WebSocket(buildTelemetryWsUrl());
                wsRef.current = ws;
                ws.onopen = () => {
                    retry = 0;
                    setWsConnected(true);
                };
                ws.onclose = () => {
                    setWsConnected(false);
                    if (!stopped) {
                        retry += 1;
                        setTimeout(connect, Math.min(15000, 1000 * retry));
                    }
                };
                ws.onerror = () => {
                    /* will close */
                };
                ws.onmessage = (ev) => {
                    try {
                        const msg = JSON.parse(ev.data);
                        if (msg.type === 'reading' && msg.reading) {
                            setLatestReading(msg.reading);
                            setHistory((prev) => {
                                const next = [
                                    ...prev,
                                    {
                                        ts: msg.reading.timestamp || new Date().toISOString(),
                                        mpsas: msg.reading.mpsas,
                                        temperature: msg.reading.temperature_c,
                                        frequency: msg.reading.frequency_hz,
                                        counts: msg.reading.counts,
                                    },
                                ];
                                if (next.length > MAX_HISTORY) next.splice(0, next.length - MAX_HISTORY);
                                return next;
                            });
                        }
                        if (msg.type === 'started' || msg.type === 'reading' || msg.type === 'stopped') {
                            if (msg.session) setLoggingSession(msg.session);
                        }
                        if (msg.type === 'stopped') {
                            setLoggingSession((s) => (s ? { ...s, active: false } : s));
                        }
                    } catch (e) {
                        // ignore
                    }
                };
            } catch (e) {
                console.error(e);
            }
        };
        connect();
        return () => {
            stopped = true;
            if (wsRef.current) {
                try {
                    wsRef.current.close();
                } catch (e) { /* ignore */ }
            }
        };
    }, []);

    // Periodic status refresh
    useEffect(() => {
        refreshStatus();
        const id = setInterval(refreshStatus, 5000);
        return () => clearInterval(id);
    }, [refreshStatus]);

    const clearHistory = useCallback(() => setHistory([]), []);

    const value = useMemo(
        () => ({
            status,
            setStatus,
            info,
            setInfo,
            latestReading,
            history,
            clearHistory,
            loggingSession,
            setLoggingSession,
            wsConnected,
            refreshStatus,
        }),
        [status, info, latestReading, history, clearHistory, loggingSession, wsConnected, refreshStatus]
    );

    return <DeviceContext.Provider value={value}>{children}</DeviceContext.Provider>;
};
