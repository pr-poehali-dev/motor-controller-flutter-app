import { useState, useCallback, useEffect } from 'react';

export interface Settings {
  ip: string;
  deviceName: string;
  autoConnect: boolean;
}

const KEY = 'motor-controller-settings';

const DEFAULTS: Settings = {
  ip: '192.168.4.1',
  deviceName: 'ESP8266 Motor',
  autoConnect: true,
};

function load(): Settings {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) return { ...DEFAULTS, ...JSON.parse(raw) };
  } catch {
    /* ignore */
  }
  return DEFAULTS;
}

export function useSettings() {
  const [settings, setSettings] = useState<Settings>(load);

  useEffect(() => {
    try {
      localStorage.setItem(KEY, JSON.stringify(settings));
    } catch {
      /* ignore */
    }
  }, [settings]);

  const update = useCallback((patch: Partial<Settings>) => {
    setSettings((prev) => ({ ...prev, ...patch }));
  }, []);

  return { settings, update };
}
