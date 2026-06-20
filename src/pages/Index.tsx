import { useState, useEffect, useRef, useCallback } from 'react';
import Icon from '@/components/ui/icon';
import { Slider } from '@/components/ui/slider';

const LOGO = 'https://cdn.poehali.dev/projects/a8cc62f8-b096-4667-89e2-dde214e0303c/files/8a8bd75b-3712-4107-8dd3-1f8598e7e0c1.jpg';

type MotorState = 'stopped' | 'running' | 'emergency';

const STATE_META: Record<MotorState, { label: string; color: string; glow: string; icon: string }> = {
  stopped: { label: 'ОСТАНОВЛЕН', color: 'text-muted-foreground', glow: '', icon: 'Power' },
  running: { label: 'РАБОТАЕТ', color: 'text-primary neon-text-cyan', glow: 'neon-glow-cyan', icon: 'Zap' },
  emergency: { label: 'АВАРИЯ', color: 'text-destructive neon-text-red', glow: 'neon-glow-red', icon: 'TriangleAlert' },
};

const Index = () => {
  const [connected, setConnected] = useState(true);
  const [motor, setMotor] = useState<MotorState>('stopped');
  const [speed, setSpeed] = useState(0);
  const [targetSpeed, setTargetSpeed] = useState(40);
  const [turbo, setTurbo] = useState(false);
  const [uptime, setUptime] = useState(0);
  const tickRef = useRef<number | null>(null);

  // Симуляция: статус каждые 500мс, плавный разгон скорости
  useEffect(() => {
    const id = window.setInterval(() => {
      setSpeed((cur) => {
        const goal = motor === 'running' ? (turbo ? 100 : targetSpeed) : 0;
        const diff = goal - cur;
        if (Math.abs(diff) < 1) return goal;
        return Math.round(cur + diff * 0.25);
      });
      setUptime((u) => (motor === 'running' ? u + 0.5 : motor === 'stopped' ? 0 : u));
    }, 500);
    tickRef.current = id;
    return () => window.clearInterval(id);
  }, [motor, turbo, targetSpeed]);

  const fmtUptime = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = Math.floor(s % 60);
    return `${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`;
  };

  const onStart = () => { if (motor !== 'emergency') { setMotor('running'); setTurbo(false); } };
  const onStop = () => { setMotor('stopped'); setTurbo(false); };
  const onTurbo = () => { if (motor === 'running') setTurbo((t) => !t); };
  const onEmergency = () => { setMotor('emergency'); setTurbo(false); };
  const reconnect = () => setConnected(true);

  const onSpeedChange = useCallback((v: number[]) => {
    setTargetSpeed(v[0]);
    if (turbo) setTurbo(false);
  }, [turbo]);

  const meta = STATE_META[motor];
  const ringActive = motor === 'running';

  return (
    <div className="min-h-screen w-full text-foreground px-4 py-6 sm:py-8 flex flex-col items-center">
      {/* scanline overlay */}
      <div className="pointer-events-none fixed inset-0 z-50 overflow-hidden opacity-[0.04]">
        <div className="absolute left-0 right-0 h-24 bg-gradient-to-b from-transparent via-primary to-transparent"
             style={{ animation: 'scan 6s linear infinite' }} />
      </div>

      <div className="w-full max-w-md flex flex-col gap-5">
        {/* Header */}
        <header className="flex items-center gap-3 animate-rise">
          <img src={LOGO} alt="Motor Controller" className="w-12 h-12 rounded-xl object-cover neon-border-cyan animate-flicker" />
          <div className="flex-1">
            <h1 className="font-display font-black text-xl tracking-widest leading-none neon-text-cyan text-primary">
              MOTOR
            </h1>
            <p className="font-mono-tech text-[10px] tracking-[0.35em] text-accent neon-text-magenta">CONTROLLER</p>
          </div>
          <ConnBadge connected={connected} />
        </header>

        {/* Connection lost banner */}
        {!connected && (
          <button onClick={reconnect}
            className="glass rounded-2xl border border-destructive/50 neon-glow-red p-4 flex items-center justify-between animate-rise">
            <span className="flex items-center gap-2 text-destructive font-mono-tech text-sm">
              <Icon name="WifiOff" size={18} /> Связь потеряна
            </span>
            <span className="flex items-center gap-1.5 text-xs font-semibold bg-destructive/20 text-destructive px-3 py-1.5 rounded-lg">
              <Icon name="RotateCw" size={14} /> Повторить
            </span>
          </button>
        )}

        {/* Main gauge */}
        <section className="glass rounded-3xl border border-border p-6 animate-rise" style={{ animationDelay: '60ms' }}>
          <div className="relative mx-auto w-56 h-56 flex items-center justify-center">
            {/* pulse rings */}
            {ringActive && (
              <>
                <div className="absolute inset-0 rounded-full border border-primary/30" style={{ animation: 'pulse-ring 2s ease-in-out infinite' }} />
                <div className="absolute inset-2 rounded-full border border-accent/20" style={{ animation: 'pulse-ring 2s ease-in-out infinite 0.4s' }} />
              </>
            )}
            {/* gauge track */}
            <svg className="absolute inset-0 -rotate-90" viewBox="0 0 200 200">
              <circle cx="100" cy="100" r="88" fill="none" stroke="hsl(200 50% 20% / 0.4)" strokeWidth="6" />
              <circle cx="100" cy="100" r="88" fill="none"
                stroke={motor === 'emergency' ? 'hsl(350 100% 60%)' : turbo ? 'hsl(50 100% 55%)' : 'hsl(175 100% 50%)'}
                strokeWidth="6" strokeLinecap="round"
                strokeDasharray={2 * Math.PI * 88}
                strokeDashoffset={2 * Math.PI * 88 * (1 - speed / 100)}
                style={{ transition: 'stroke-dashoffset 0.5s ease, stroke 0.3s', filter: 'drop-shadow(0 0 6px currentColor)' }} />
            </svg>
            {/* center */}
            <div className="flex flex-col items-center z-10">
              <Icon name={meta.icon} size={26}
                className={`mb-1 ${meta.color} ${ringActive ? 'animate-pulse' : ''}`} />
              <div className={`font-display font-black text-6xl leading-none ${motor === 'emergency' ? 'text-destructive neon-text-red' : 'text-primary neon-text-cyan'}`}>
                {speed}
              </div>
              <div className="font-mono-tech text-xs tracking-widest text-muted-foreground mt-1">% МОЩНОСТИ</div>
              {turbo && (
                <div className="mt-2 flex items-center gap-1 text-[10px] font-bold tracking-widest text-yellow-300 px-2 py-0.5 rounded-full border border-yellow-300/40"
                     style={{ boxShadow: '0 0 12px hsl(50 100% 55% / 0.5)' }}>
                  <Icon name="Zap" size={11} /> TURBO
                </div>
              )}
            </div>
          </div>

          {/* status row */}
          <div className="grid grid-cols-2 gap-3 mt-5">
            <StatCard label="СОСТОЯНИЕ" value={meta.label} valueClass={meta.color} icon="Activity" />
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
          <Slider value={[targetSpeed]} onValueChange={onSpeedChange} max={100} step={1}
            disabled={motor === 'emergency'} className="py-2" />
          <div className="flex justify-between mt-1 font-mono-tech text-[10px] text-muted-foreground">
            <span>0</span><span>50</span><span>100</span>
          </div>
        </section>

        {/* Controls */}
        <section className="grid grid-cols-2 gap-3 animate-rise" style={{ animationDelay: '180ms' }}>
          <CtrlButton onClick={onStart} disabled={motor === 'emergency'} active={motor === 'running'}
            color="cyan" icon="Play" label="СТАРТ" />
          <CtrlButton onClick={onStop} color="slate" icon="Square" label="СТОП" />
          <CtrlButton onClick={onTurbo} disabled={motor !== 'running'} active={turbo}
            color="yellow" icon="Zap" label="ТУРБО" />
          <CtrlButton onClick={onEmergency} color="red" icon="OctagonAlert" label="АВАРИЯ" />
        </section>

        {/* reset from emergency */}
        {motor === 'emergency' && (
          <button onClick={onStop}
            className="glass rounded-2xl border border-border p-3 text-center font-mono-tech text-sm text-muted-foreground hover:text-primary transition-colors animate-rise">
            <Icon name="RotateCcw" size={15} className="inline mr-1.5" /> Сбросить аварию
          </button>
        )}

        <footer className="text-center font-mono-tech text-[10px] text-muted-foreground/60 tracking-widest pt-2">
          ESP8266 · 192.168.4.1 · v1.0
        </footer>
      </div>
    </div>
  );
};

const ConnBadge = ({ connected }: { connected: boolean }) => (
  <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[10px] font-mono-tech tracking-wider glass border ${connected ? 'border-primary/40 text-primary' : 'border-destructive/40 text-destructive'}`}>
    <span className={`w-2 h-2 rounded-full ${connected ? 'bg-primary' : 'bg-destructive'} ${connected ? 'animate-pulse' : ''}`}
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
        ${disabled ? 'opacity-30 cursor-not-allowed' : 'hover:scale-[1.03] hover:' + c.bg}`}>
      <Icon name={icon} size={28} className={`${c.text} ${active ? 'animate-pulse' : ''}`} />
      <span className={`font-display font-bold text-xs tracking-widest ${c.text}`}>{label}</span>
    </button>
  );
};

export default Index;