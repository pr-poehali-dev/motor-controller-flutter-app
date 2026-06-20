export type MotorState = 'stopped' | 'running' | 'emergency';

export interface MotorStatus {
  state: MotorState;
  speed: number;
  uptime: number;
  turbo: boolean;
}

const DEFAULT_TIMEOUT = 1500;

function normalizeState(raw: unknown): MotorState {
  const s = String(raw ?? '').toLowerCase();
  if (s.includes('emerg') || s.includes('авар')) return 'emergency';
  if (s.includes('run') || s.includes('start') || s.includes('работ') || s === '1' || s === 'on') return 'running';
  return 'stopped';
}

export class ApiService {
  private ip: string;

  constructor(ip: string) {
    this.ip = ip;
  }

  setIp(ip: string) {
    this.ip = ip;
  }

  private get base() {
    const host = this.ip.replace(/^https?:\/\//, '').replace(/\/$/, '');
    return `http://${host}`;
  }

  private async request(path: string): Promise<Response> {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), DEFAULT_TIMEOUT);
    try {
      return await fetch(`${this.base}${path}`, { signal: controller.signal, cache: 'no-store' });
    } finally {
      clearTimeout(timer);
    }
  }

  async startMotor() { await this.request('/start'); }
  async stopMotor() { await this.request('/stop'); }
  async turbo() { await this.request('/turbo'); }
  async emergency() { await this.request('/emergency'); }
  async setSpeed(value: number) {
    const v = Math.max(0, Math.min(100, Math.round(value)));
    await this.request(`/speed?value=${v}`);
  }

  async getStatus(): Promise<MotorStatus> {
    const res = await this.request('/status');
    let data: Record<string, unknown> = {};
    try {
      data = await res.clone().json();
    } catch {
      const text = await res.text();
      text.split(/[,;\n]/).forEach((pair) => {
        const [k, val] = pair.split(/[:=]/).map((x) => x?.trim());
        if (k) data[k.toLowerCase()] = val;
      });
    }
    return {
      state: normalizeState(data.state ?? data.status ?? data.motor),
      speed: Number(data.speed ?? data.value ?? 0) || 0,
      uptime: Number(data.uptime ?? data.time ?? 0) || 0,
      turbo: data.turbo === true || data.turbo === 'true' || data.turbo === '1',
    };
  }
}
