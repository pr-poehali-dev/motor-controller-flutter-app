import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import Icon from '@/components/ui/icon';
import type { Settings } from '@/hooks/useSettings';

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  settings: Settings;
  update: (patch: Partial<Settings>) => void;
}

const SettingsPanel = ({ open, onOpenChange, settings, update }: Props) => (
  <Sheet open={open} onOpenChange={onOpenChange}>
    <SheetContent side="right" className="glass border-l border-border w-[88vw] sm:max-w-sm text-foreground">
      <SheetHeader className="mb-6">
        <SheetTitle className="font-display tracking-widest text-primary neon-text-cyan flex items-center gap-2">
          <Icon name="Settings2" size={20} /> НАСТРОЙКИ
        </SheetTitle>
      </SheetHeader>

      <div className="flex flex-col gap-5">
        <Field label="IP-адрес ESP" icon="Network">
          <Input value={settings.ip} onChange={(e) => update({ ip: e.target.value })}
            placeholder="192.168.4.1" inputMode="decimal"
            className="font-mono-tech bg-secondary/40 border-border focus-visible:ring-primary" />
        </Field>

        <Field label="Имя устройства" icon="Tag">
          <Input value={settings.deviceName} onChange={(e) => update({ deviceName: e.target.value })}
            placeholder="ESP8266 Motor"
            className="bg-secondary/40 border-border focus-visible:ring-primary" />
        </Field>

        <div className="flex items-center justify-between rounded-2xl bg-secondary/40 border border-border p-4">
          <div>
            <div className="flex items-center gap-2 font-medium text-sm">
              <Icon name="Wifi" size={16} className="text-primary" /> Автоподключение
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">Подключаться при запуске</p>
          </div>
          <Switch checked={settings.autoConnect} onCheckedChange={(v) => update({ autoConnect: v })} />
        </div>

        <div className="rounded-2xl border border-border p-4 text-xs text-muted-foreground font-mono-tech leading-relaxed">
          <Icon name="Info" size={14} className="inline mr-1.5 text-accent" />
          Браузер блокирует HTTP-запросы к ESP с защищённой страницы. Для прямого управления откройте приложение по локальному HTTP-адресу или используйте Wi-Fi точки ESP.
        </div>

        <div className="text-center font-mono-tech text-[10px] text-muted-foreground/60 tracking-widest pt-2">
          MOTOR CONTROLLER · v1.0
        </div>
      </div>
    </SheetContent>
  </Sheet>
);

const Field = ({ label, icon, children }: { label: string; icon: string; children: React.ReactNode }) => (
  <div>
    <label className="flex items-center gap-1.5 text-[10px] tracking-widest text-muted-foreground font-mono-tech mb-2">
      <Icon name={icon} size={12} /> {label.toUpperCase()}
    </label>
    {children}
  </div>
);

export default SettingsPanel;
