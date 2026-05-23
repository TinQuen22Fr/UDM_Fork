import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { buildTelemetryWsUrl, getDeviceStatus } from '@/lib/api';

const DeviceContext = createContext(null);

export const useDevice = () => {
    const ctx = useContext(DeviceContext);
    if (!ctx) throw new Error('useDevice must be used within DeviceProvider');
    return ctx;
};

const MAX_HISTORY = 1200; // ~40 min at 2 s

// localStorage keys for telemetry tuning
const LS_POLL = 'udm.telemetry.pollSec';   // backend polling interval (s)
const LS_SMOOTH = 'udm.telemetry.smoothN'; // client-side smoothing window (samples), 1 = off

function getPollSec() {
    const raw = parseFloat(localStorage.getItem(LS_POLL));
    if (!isFinite(raw) || raw < 0.5 || raw > 30) return 2;
    return raw;
}
function getSmoothN() {
    const raw = parseInt(localStorage.getItem(LS_SMOOTH), 10);
    if (!isFinite(raw) || raw < 1 || raw > 60) return 5;
    return raw;
}

/** Compute a simple moving average over the last `n` history entries. */
function smoothedFromHistory(history, n) {
    if (!history.length) return null;
    if (n <= 1) return history[history.length - 1];
    const slice = history.slice(-n);
    const out = { ts: slice[slice.length - 1].ts };
    for (const key of ['mpsas', 'temperature', 'frequency', 'counts']) {
        const nums = slice.map((s) => s[key]).filter((v) => typeof v === 'number' && isFinite(v));
        out[key] = nums.length ? nums.reduce((a, b) => a + b, 0) / nums.length : null;
    }
    return out;
}

export const DeviceProvider = ({ children }) => {
    const [status, setStatus] = useState({ connected: false, mock_mode: false });
    const [info, setInfo] = useState(null);
    const [latestReading, setLatestReading] = useState(null);
    const [history, setHistory] = useState([]);
    const [loggingSession, setLoggingSession] = useState(null);
    const [wsConnected, setWsConnected] = useState(false);
    const [pollSec, setPollSecState] = useState(getPollSec);
    const [smoothN, setSmoothNState] = useState(getSmoothN);
    const wsRef = useRef(null);
    // Bump when telemetry tuning changes so the WS reconnects with new query
    const [wsEpoch, setWsEpoch] = useState(0);

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

    const setPollSec = useCallback((v) => {
        const clamped = Math.max(0.5, Math.min(30, Number(v) || 2));
        localStorage.setItem(LS_POLL, String(clamped));
        setPollSecState(clamped);
        setWsEpoch((e) => e + 1); // force reconnect with new ?interval=...
    }, []);
    const setSmoothN = useCallback((v) => {
        const clamped = Math.max(1, Math.min(60, parseInt(v, 10) || 1));
        localStorage.setItem(LS_SMOOTH, String(clamped));
        setSmoothNState(clamped);
    }, []);

    // WebSocket lifecycle - reopens when pollSec changes (wsEpoch)
    useEffect(() => {
        let stopped = false;
        let retry = 0;
        const connect = () => {
            try {
                const base = buildTelemetryWsUrl();
                const sep = base.includes('?') ? '&' : '?';
                const url = `${base}${sep}interval=${pollSec}`;
                const ws = new WebSocket(url);
                wsRef.current = ws;
                ws.onopen = () => { retry = 0; setWsConnected(true); };
                ws.onclose = () => {
                    setWsConnected(false);
                    if (!stopped) {
                        retry += 1;
                        setTimeout(connect, Math.min(15000, 1000 * retry));
                    }
                };
                ws.onerror = () => { /* will close */ };
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
                    } catch (e) { /* ignore */ }
                };
            } catch (e) {
                console.error(e);
            }
        };
        connect();
        return () => {
            stopped = true;
            if (wsRef.current) {
                try { wsRef.current.close(); } catch (e) { /* ignore */ }
            }
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [wsEpoch]);

    // Periodic status refresh
    useEffect(() => {
        refreshStatus();
        const id = setInterval(refreshStatus, 5000);
        return () => clearInterval(id);
    }, [refreshStatus]);

    const clearHistory = useCallback(() => setHistory([]), []);

    const smoothedReading = useMemo(() => smoothedFromHistory(history, smoothN), [history, smoothN]);

    const value = useMemo(
        () => ({
            status, setStatus,
            info, setInfo,
            latestReading,
            smoothedReading,
            history,
            clearHistory,
            loggingSession, setLoggingSession,
            wsConnected,
            refreshStatus,
            pollSec, setPollSec,
            smoothN, setSmoothN,
        }),
        [status, info, latestReading, smoothedReading, history, clearHistory, loggingSession, wsConnected, refreshStatus, pollSec, setPollSec, smoothN, setSmoothN]
    );

    return <DeviceContext.Provider value={value}>{children}</DeviceContext.Provider>;
};
