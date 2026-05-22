import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import fr from '@/locales/fr.json';
import en from '@/locales/en.json';

const DICTS = { fr, en };
const FALLBACK_LANG = 'fr';
const SUPPORTED = ['fr', 'en'];
const STORAGE_KEY = 'udm.lang';

const I18nContext = createContext(null);

function lookup(dict, key) {
    if (!dict || !key) return undefined;
    const parts = key.split('.');
    let cur = dict;
    for (const p of parts) {
        if (cur && typeof cur === 'object' && p in cur) {
            cur = cur[p];
        } else {
            return undefined;
        }
    }
    return typeof cur === 'string' ? cur : undefined;
}

function interpolate(str, vars) {
    if (!vars) return str;
    return str.replace(/\{(\w+)\}/g, (_, name) => (vars[name] !== undefined ? String(vars[name]) : `{${name}}`));
}

export function I18nProvider({ children, defaultLang = FALLBACK_LANG }) {
    const [lang, setLangState] = useState(() => {
        try {
            const saved = localStorage.getItem(STORAGE_KEY);
            if (saved && SUPPORTED.includes(saved)) return saved;
        } catch (e) { /* noop */ }
        return defaultLang;
    });

    useEffect(() => {
        try {
            localStorage.setItem(STORAGE_KEY, lang);
            document.documentElement.lang = lang;
        } catch (e) { /* noop */ }
    }, [lang]);

    const setLang = useCallback((next) => {
        if (SUPPORTED.includes(next)) setLangState(next);
    }, []);

    const t = useCallback((key, vars) => {
        const primary = lookup(DICTS[lang], key);
        if (primary !== undefined) return interpolate(primary, vars);
        const fallback = lookup(DICTS[FALLBACK_LANG], key);
        if (fallback !== undefined) return interpolate(fallback, vars);
        return key;
    }, [lang]);

    const value = useMemo(() => ({ lang, setLang, t, supported: SUPPORTED }), [lang, setLang, t]);

    return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n() {
    const ctx = useContext(I18nContext);
    if (!ctx) throw new Error('useI18n must be used within an I18nProvider');
    return ctx;
}
