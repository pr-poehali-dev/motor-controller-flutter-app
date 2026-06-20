import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import Icon from '@/components/ui/icon';
import { Slider } from '@/components/ui/slider';
import { ApiService, type MotorState } from '@/api/ApiService';
import { useSettings } from '@/hooks/useSettings';
import SettingsPanel from '@/components/SettingsPanel';

const LOGO = 'https://cdn.poehali.dev/projects/a8cc62f8-b096-4667-89e2-dde214e0303c/files/8a8bd75b-3712-4107-8dd3-1f8598e7e0c1.jpg';

const STATE_META: Record<MotorState, { label: string; color: string; glow: string; icon: string }> = {
  stopped: { label: 'ОСТАНОВЛЕН', color: 'text-muted-foreground', glow: '', icon: 'Power' },
  running: { label: 'РАБОТАЕТ', color: 'text-primary neon-text-cyan', glow: 'neon-glow-cyan', icon: 'Zap' },
  emergency: { label: 'АВАРИЯ', color: 'text-destructive neon-text-red', glow: 'neon-glow-red', icon: 'TriangleAlert' },
};

const Index = () => {
  const { settings, update } = useSettings();
  const [showSettings, setShowSettings] = useState(false);

  const [connected, setConnected] = useState(false);
  const [motor, setMotor] = useState<MotorState>('stopped');
  const [speed, setSpeed] = useState(0);
  const [targetSpeed, setTargetSpeed] = useState(40);
  const [turbo, setTurbo] = useState(false);
  const [uptime, setUptime] = useState(0);
  const [busy, setBusy] = useState(false);

  const api = useMemo(() => new ApiService(settings.ip), []); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { api.setIp(settings.ip); }, [api, settings.ip]);

  const isHttpsBlocked = window.location.protocol === 'https:';


  const pollRef = useRef<number | null>(null);
  const failCount = useRef(0);
  const draggingRef = useRef(false);

  const poll = useCallback(async () => {
    try {
      const st = await api.getStatus();
      failCount.current = 0;
      setConnected(true);
      setMotor(st.state);
      setSpeed(st.speed);
      setTurbo(st.turbo);
      setUptime(st.uptime);
      if (!draggingRef.current) {
        setTargetSpeed(st.speed);
      }
    } catch {
      failCount.current += 1;
      if (failCount.current >= 2) setConnected(false);
    }
  }, [api]);

  const startPolling = useCallback(() => {
    if (pollRef.current) return;
    poll();
    pollRef.current = window.setInterval(poll, 500);
  }, [poll]);

  const stopPolling = useCallback(() => {
    if (pollRef.current) {
      window.clearInterval(pollRef.current);
      pollRef.current = null;
    }
  }, []);

  useEffect(() => {
    if (settings.autoConnect) startPolling();
    return stopPolling;
  }, [settings.autoConnect, startPolling, stopPolling]);

  const reconnect = useCallback(() => {
    failCount.current = 0;
    stopPolling();
    startPolling();
  }, [startPolling, stopPolling]);

  const wrap = useCallback(async (fn: () => Promise<void>) => {
    setBusy(true);
    try { await fn(); await poll(); }
    catch { failCount.current += 1; if (failCount.current >= 2) setConnected(false); }
    finally { setBusy(false); }
  }, [poll]);

  const onStart = () => wrap(() => api.startMotor());
  const onStop = () => wrap(() => api.stopMotor());
  const onTurbo = () => wrap(() => api.turbo());
  const onEmergency = () => wrap(() => api.emergency());

  const onSpeedChange = useCallback((v: number[]) => {
    draggingRef.current = true;
    setTargetSpeed(v[0]);
  }, []);

  const onSpeedCommit = useCallback((v: number[]) => {
    draggingRef.current = false;
    api.setSpeed(v[0]).catch(() => { failCount.current += 1; if (failCount.current >= 2) setConnected(false); });
  }, [api]);

  const fmtUptime = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = Math.floor(s % 60);
    return `${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`;
  };

  const meta = STATE_META[motor];
  const ringActive = connected && motor === 'running';

  return (
    <div className="min-h-screen w-full text-foreground px-4 py-6 sm:py-8 flex flex-col items-center">
      <div className="pointer-events-none fixed inset-0 z-50 overflow-hidden opacity-[0.04]">
        <div className="absolute left-0 right-0 h-24 bg-gradient-to-b from-transparent via-primary to-transparent"
             style={{ animation: 'scan 6s linear infinite' }} />
      </div>

      <SettingsPanel open={showSettings} onOpenChange={setShowSettings} settings={settings} update={update} />

      <div className="w-full max-w-md flex flex-col gap-5">
        {/* Header */}
        <header className="flex items-center gap-3 animate-rise">
          <img src={LOGO} alt="Motor Controller" className="w-12 h-12 rounded-xl object-cover neon-border-cyan animate-flicker" />
          <div className="flex-1 min-w-0">
            <h1 className="font-display font-black text-xl tracking-widest leading-none neon-text-cyan text-primary">MOTOR</h1>
            <p className="font-mono-tech text-[10px] tracking-[0.3em] text-accent neon-text-magenta truncate">{settings.deviceName}</p>
          </div>
          <ConnBadge connected={connected} />
          <button onClick={() => setShowSettings(true)}
            className="w-10 h-10 rounded-xl glass border border-border flex items-center justify-center text-primary hover:neon-border-cyan transition-all active:scale-95">
            <Icon name="Settings" size={18} />
          </button>
        </header>

        {/* HTTPS blocked warning */}
        {isHttpsBlocked && (
          <div className="glass rounded-2xl border border-yellow-400/40 p-4 animate-rise" style={{ boxShadow: '0 0 16px hsl(50 100% 55% / 0.2)' }}>
            <div className="flex items-start gap-3">
              <Icon name="TriangleAlert" size={18} className="text-yellow-300 shrink-0 mt-0.5" />
              <div>
                <p className="font-mono-tech text-xs text-yellow-300 font-bold tracking-wider mb-1">ОГРАНИЧЕНИЕ БРАУЗЕРА</p>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Сайт открыт по HTTPS — браузер блокирует запросы к ESP (HTTP). Для реального управления:
                </p>
                <ol className="text-xs text-muted-foreground mt-2 space-y-1 list-decimal list-inside leading-relaxed">
                  <li>Подключи телефон к Wi-Fi точке ESP8266</li>
                  <li>Скачай билд: <strong className="text-yellow-300">Скачать → Скачать билд</strong></li>
                  <li>Открой <code className="text-primary">index.html</code> в браузере телефона</li>
                </ol>
              </div>
            </div>
          </div>
        )}

        {/* Connection lost banner */}
        {!connected && (
          <button onClick={reconnect}
            className="glass rounded-2xl border border-destructive/50 neon-glow-red p-4 flex items-center justify-between animate-rise">
            <span className="flex items-center gap-2 text-destructive font-mono-tech text-sm">
              <Icon name="WifiOff" size={18} /> Нет связи с устройством
            </span>
            <span className="flex items-center gap-1.5 text-xs font-semibold bg-destructive/20 text-destructive px-3 py-1.5 rounded-lg">
              <Icon name="RotateCw" size={14} /> Повторить
            </span>
          </button>
        )}

        {/* Main gauge */}
        <section className="glass rounded-3xl border border-border p-6 animate-rise" style={{ animationDelay: '60ms' }}>
          <div className="relative mx-auto w-56 h-56 flex items-center justify-center">
            {ringActive && (
              <>
                <div className="absolute inset-0 rounded-full border border-primary/30" style={{ animation: 'pulse-ring 2s ease-in-out infinite' }} />
                <div className="absolute inset-2 rounded-full border border-accent/20" style={{ animation: 'pulse-ring 2s ease-in-out infinite 0.4s' }} />
              </>
            )}
            <svg className="absolute inset-0 -rotate-90" viewBox="0 0 200 200">
              <circle cx="100" cy="100" r="88" fill="none" stroke="hsl(200 50% 20% / 0.4)" strokeWidth="6" />
              <circle cx="100" cy="100" r="88" fill="none"
                stroke={!connected ? 'hsl(200 50% 30%)' : motor === 'emergency' ? 'hsl(350 100% 60%)' : turbo ? 'hsl(50 100% 55%)' : 'hsl(175 100% 50%)'}
                strokeWidth="6" strokeLinecap="round"
                strokeDasharray={2 * Math.PI * 88}
                strokeDashoffset={2 * Math.PI * 88 * (1 - speed / 100)}
                style={{ transition: 'stroke-dashoffset 0.5s ease, stroke 0.3s', filter: 'drop-shadow(0 0 6px currentColor)' }} />
            </svg>
            <div className="flex flex-col items-center z-10">
              <Icon name={connected ? meta.icon : 'PowerOff'} size={26}
                className={`mb-1 ${connected ? meta.color : 'text-muted-foreground'} ${ringActive ? 'animate-pulse' : ''}`} />
              <div className={`font-display font-black text-6xl leading-none ${motor === 'emergency' && connected ? 'text-destructive neon-text-red' : connected ? 'text-primary neon-text-cyan' : 'text-muted-foreground'}`}>
                {speed}
              </div>
              <div className="font-mono-tech text-xs tracking-widest text-muted-foreground mt-1">% МОЩНОСТИ</div>
              {turbo && connected && (
                <div className="mt-2 flex items-center gap-1 text-[10px] font-bold tracking-widest text-yellow-300 px-2 py-0.5 rounded-full border border-yellow-300/40"
                     style={{ boxShadow: '0 0 12px hsl(50 100% 55% / 0.5)' }}>
                  <Icon name="Zap" size={11} /> TURBO
                </div>
              )}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 mt-5">
            <StatCard label="СОСТОЯНИЕ" value={connected ? meta.label : 'НЕТ СВЯЗИ'} valueClass={connected ? meta.color : 'text-muted-foreground'} icon="Activity" />
            <StatCard label="ВРЕМЯ РАБОТЫ" value={fmtUptime(uptime)} valueClass="text-primary" icon="Clock" mono />
          </div>
        </section>

        {/* Speed slider */}
        <section className="glass rounded-3xl border border-border p-5 animate-rise" style={{ animationDelay: '120ms' }}>
          <div className="flex items-center justify-between mb-3">
            <span className="font-mono-tech text-xs tracking-widest text-muted-foreground flex items-center gap-1.5">
              <Icon name="Gauge" size={14} /> ЦЕЛЕВАЯ СКОРОСТЬ
            </span>
            <span className="font-display font-bold text-lg text-primary neon-text-cyan">{targetSpeed}%</span>
          </div>
          <Slider value={[targetSpeed]} onValueChange={onSpeedChange} onValueCommit={onSpeedCommit}
            max={100} step={1} disabled={!connected || motor === 'emergency'} className="py-2" />
          <div className="flex justify-between mt-1 font-mono-tech text-[10px] text-muted-foreground">
            <span>0</span><span>50</span><span>100</span>
          </div>
        </section>

        {/* Controls */}
        <section className="grid grid-cols-2 gap-3 animate-rise" style={{ animationDelay: '180ms' }}>
          <CtrlButton onClick={onStart} disabled={!connected || busy || motor === 'emergency'} active={motor === 'running'} color="cyan" icon="Play" label="СТАРТ" />
          <CtrlButton onClick={onStop} disabled={!connected || busy} color="slate" icon="Square" label="СТОП" />
          <CtrlButton onClick={onTurbo} disabled={!connected || busy || motor !== 'running'} active={turbo} color="yellow" icon="Zap" label="ТУРБО" />
          <CtrlButton onClick={onEmergency} disabled={!connected || busy} color="red" icon="OctagonAlert" label="АВАРИЯ" />
        </section>

        <footer className="text-center font-mono-tech text-[10px] text-muted-foreground/60 tracking-widest pt-2">
          ESP8266 · {settings.ip} · v1.0
        </footer>
      </div>
    </div>
  );
};

const ConnBadge = ({ connected }: { connected: boolean }) => (
  <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[10px] font-mono-tech tracking-wider glass border ${connected ? 'border-primary/40 text-primary' : 'border-destructive/40 text-destructive'}`}>
    <span className={`w-2 h-2 rounded-full ${connected ? 'bg-primary animate-pulse' : 'bg-destructive'}`}
      style={{ boxShadow: connected ? '0 0 8px hsl(175 100% 50%)' : '0 0 8px hsl(350 100% 60%)' }} />
    {connected ? 'ONLINE' : 'OFFLINE'}
  </div>
);

const StatCard = ({ label, value, valueClass, icon, mono }: { label: string; value: string; valueClass: string; icon: string; mono?: boolean }) => (
  <div className="rounded-2xl bg-secondary/40 border border-border p-3">
    <div className="flex items-center gap-1.5 text-[9px] tracking-widest text-muted-foreground font-mono-tech mb-1">
      <Icon name={icon} size={11} /> {label}
    </div>
    <div className={`font-bold text-sm ${mono ? 'font-mono-tech' : 'font-display tracking-wide'} ${valueClass}`}>{value}</div>
  </div>
);

const COLORS: Record<string, { ring: string; text: string; glow: string; bg: string }> = {
  cyan: { ring: 'border-primary/50', text: 'text-primary', glow: 'neon-glow-cyan', bg: 'bg-primary/10' },
  slate: { ring: 'border-border', text: 'text-foreground', glow: '', bg: 'bg-secondary/50' },
  yellow: { ring: 'border-yellow-400/50', text: 'text-yellow-300', glow: '', bg: 'bg-yellow-400/10' },
  red: { ring: 'border-destructive/50', text: 'text-destructive', glow: 'neon-glow-red', bg: 'bg-destructive/10' },
};

const CtrlButton = ({ onClick, disabled, active, color, icon, label }: {
  onClick: () => void; disabled?: boolean; active?: boolean; color: string; icon: string; label: string;
}) => {
  const c = COLORS[color];
  return (
    <button onClick={onClick} disabled={disabled}
      className={`relative overflow-hidden rounded-2xl border p-4 flex flex-col items-center gap-2 transition-all duration-200 active:scale-95
        ${c.ring} ${active ? `${c.bg} ${c.glow}` : 'glass'}
        ${disabled ? 'opacity-30 cursor-not-allowed' : 'hover:scale-[1.03]'}`}>
      <Icon name={icon} size={28} className={`${c.text} ${active ? 'animate-pulse' : ''}`} />
      <span className={`font-display font-bold text-xs tracking-widest ${c.text}`}>{label}</span>
    </button>
  );
};

export default Index;