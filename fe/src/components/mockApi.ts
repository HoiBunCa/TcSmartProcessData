export type ProcessAction = 'qrcode' | 'barcode' | 'pdf2layer';

export type LogStatus = 'info' | 'processing' | 'success' | 'error';

export interface LogEntry {
  id: string;
  status: LogStatus;
  title: string;
  detail?: string;
  ts: string;
}

export interface UploadResult {
  sessionId: string;
  files: Array<{ name: string; size: number }>;
}

export interface ProcessResultItem {
  inputName: string;
  outputName: string;
  ok: boolean;
  message: string;
}

export interface ProcessResult {
  sessionId: string;
  action: ProcessAction;
  results: ProcessResultItem[];
}

export interface DownloadResult {
  sessionId: string;
  filename: string;
  blob: Blob;
}

export interface AppSettings {
  API_TOKEN: string;
  TIME_SLEEP: number; // ms
  API_BASE_URL: string;
}

const SETTINGS_KEY = 'tc_settings_v1';

export function loadSettings(): AppSettings {
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    if (!raw) {
      return {
        API_TOKEN: '',
        TIME_SLEEP: 600,
        API_BASE_URL: 'http://localhost:8000',
      };
    }
    const parsed = JSON.parse(raw) as Partial<AppSettings>;
    return {
      API_TOKEN: parsed.API_TOKEN ?? '',
      TIME_SLEEP: typeof parsed.TIME_SLEEP === 'number' ? parsed.TIME_SLEEP : 600,
      API_BASE_URL: parsed.API_BASE_URL ?? 'http://localhost:8000',
    };
  } catch {
    return {
      API_TOKEN: '',
      TIME_SLEEP: 600,
      API_BASE_URL: 'http://localhost:8000',
    };
  }
}

export function saveSettings(settings: AppSettings) {
  localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
}

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

function uid(prefix: string) {
  return `${prefix}_${Math.random().toString(16).slice(2)}_${Date.now()}`;
}

function randOk(probOk = 0.9) {
  return Math.random() < probOk;
}

function makeOutputName(action: ProcessAction, input: string) {
  const base = input.replace(/\.pdf$/i, '');
  switch (action) {
    case 'qrcode':
      return `${base}__QR_RENAMED.pdf`;
    case 'barcode':
      return `${base}__BARCODE_RENAMED.pdf`;
    case 'pdf2layer':
      return `${base}__2LAYER.pdf`;
  }
}

/**
 * Mock API: Upload
 * - returns a sessionId + file metadata
 */
export async function mockUpload(files: File[], settings: AppSettings): Promise<UploadResult> {
  await sleep(Math.min(Math.max(settings.TIME_SLEEP, 200), 2000));
  return {
    sessionId: uid('sess'),
    files: files.map((f) => ({ name: f.name, size: f.size })),
  };
}

/**
 * Mock API: Process all uploaded files for an action
 * - simulates per-file results
 */
export async function mockProcess(
  sessionId: string,
  action: ProcessAction,
  files: Array<{ name: string; size: number }>,
  settings: AppSettings
): Promise<ProcessResult> {
  // simulate overall API call latency
  await sleep(Math.min(Math.max(settings.TIME_SLEEP, 200), 2000));

  const results: ProcessResultItem[] = [];
  for (const f of files) {
    // simulate per-file processing time a bit
    await sleep(50);
    const ok = randOk(action === 'pdf2layer' ? 0.85 : 0.9);
    results.push({
      inputName: f.name,
      outputName: ok ? makeOutputName(action, f.name) : f.name,
      ok,
      message: ok ? 'Processed successfully' : 'Failed (mock error)',
    });
  }

  return { sessionId, action, results };
}

/**
 * Mock API: Download processed output
 * - returns a Blob as if backend generated a packaged output.
 */
export async function mockDownload(
  sessionId: string,
  action: ProcessAction,
  results: ProcessResultItem[],
  settings: AppSettings
): Promise<DownloadResult> {
  await sleep(Math.min(Math.max(settings.TIME_SLEEP, 200), 2000));

  const payload = {
    sessionId,
    action,
    exportedAt: new Date().toISOString(),
    files: results.map((r) => ({
      input: r.inputName,
      output: r.outputName,
      ok: r.ok,
      message: r.message,
    })),
  };

  const json = JSON.stringify(payload, null, 2);
  const blob = new Blob([json], { type: 'application/json' });
  return {
    sessionId,
    filename: `processed_${action}_${sessionId}.json`,
    blob,
  };
}
