import axios from 'axios';

const BACKEND_URL =
    process.env.REACT_APP_BACKEND_URL || 'http://localhost:8001';
export const API_BASE = `${BACKEND_URL}/api`;

export const http = axios.create({
    baseURL: API_BASE,
    timeout: 30000,
});

// USB / Ports
export const fetchPorts = (onlySqm = false) =>
    http.get('/ports', { params: { only_sqm: onlySqm } }).then((r) => r.data);

// Device
export const getDeviceStatus = () => http.get('/device/status').then((r) => r.data);
export const connectDevice = (params) =>
    http.post('/device/connect', params).then((r) => r.data);
export const disconnectDevice = () =>
    http.post('/device/disconnect').then((r) => r.data);
export const getDeviceInfo = () => http.get('/device/info').then((r) => r.data);
export const getDeviceReading = (averaged = true) =>
    http
        .get('/device/reading', { params: { averaged } })
        .then((r) => r.data);
export const getCalibrationInfo = () =>
    http.get('/device/calibration').then((r) => r.data);
export const sendRawCommand = (command, timeout = 2.0) =>
    http.post('/device/command', { command, timeout }).then((r) => r.data);
export const setLoggingInterval = (seconds) =>
    http.post('/device/interval', { seconds }).then((r) => r.data);
export const calibrateDevice = (action) =>
    http.post('/device/calibrate', { action }).then((r) => r.data);

// Logging
export const startLogging = (params) =>
    http.post('/logging/start', params).then((r) => r.data);
export const stopLogging = () => http.post('/logging/stop').then((r) => r.data);
export const getLoggingStatus = () =>
    http.get('/logging/status').then((r) => r.data);
export const listLogSessions = () =>
    http.get('/logging/sessions').then((r) => r.data);
export const logDownloadUrl = (name) => `${API_BASE}/logging/download/${encodeURIComponent(name)}`;
export const getLogMetadata = () => http.get('/logging/metadata').then((r) => r.data);
export const setLogMetadata = (data) =>
    http.post('/logging/metadata', data).then((r) => r.data);

// Calibration extras
export const setCalibrationValues = (params) =>
    http.post('/device/calibration/set', params).then((r) => r.data);
export const getDeviceClock = () => http.get('/device/clock').then((r) => r.data);
export const getDLSettings = () => http.get('/device/dl_settings').then((r) => r.data);

// Firmware
export const uploadFirmware = (file) => {
    const fd = new FormData();
    fd.append('file', file);
    return http
        .post('/firmware/upload', fd, {
            headers: { 'Content-Type': 'multipart/form-data' },
        })
        .then((r) => r.data);
};
export const listFirmware = () => http.get('/firmware/list').then((r) => r.data);
export const flashFirmware = (params) =>
    http.post('/firmware/flash', params).then((r) => r.data);
export const getFirmwareStatus = () =>
    http.get('/firmware/status').then((r) => r.data);

// SQM Pro extensions
export const getWeather = () => http.get('/device/weather').then((r) => r.data);
export const getGps = () => http.get('/device/gps').then((r) => r.data);
export const getSqmProConfig = () => http.get('/device/sqm_pro/config').then((r) => r.data);
export const setSqmProCalibration = (data) =>
    http.post('/device/sqm_pro/calibration', data).then((r) => r.data);

// GitHub firmware releases (proxy)
export const fetchFirmwareReleases = (repo = 'TinQuen22Fr/SQM-Pro-ESP8266') =>
    http.get('/firmware/releases', { params: { repo } }).then((r) => r.data);
export const downloadFirmwareRelease = (url, file_name) =>
    http.post('/firmware/fetch_release', { url, file_name }).then((r) => r.data);

// System
export const getSystemInfo = () => http.get('/system/info').then((r) => r.data);

// WebSocket helper
export const buildTelemetryWsUrl = () => {
    const base = BACKEND_URL.replace(/^http/, 'ws');
    return `${base}/api/ws/telemetry`;
};
