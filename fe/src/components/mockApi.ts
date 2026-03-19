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

function withBaseUrl(baseUrl: string, path: string) {
  const base = baseUrl.replace(/\/$/, '');
  const p = path.startsWith('/') ? path : `/${path}`;
  return `${base}${p}`;
}

async function apiStartDetect(
  action: Extract<ProcessAction, 'qrcode' | 'barcode'>,
  sessionId: string,
  settings: AppSettings
): Promise<{ data: unknown; message: string }> {
  const endpoint = action === 'qrcode' ? '/app/qrcode/start/' : '/app/barcode/start/';
  const url = withBaseUrl(settings.API_BASE_URL, endpoint);

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  if (settings.API_TOKEN) headers.Authorization = `Bearer ${settings.API_TOKEN}`;

  const res = await fetch(url, {
    method: 'POST',
    headers,
    body: JSON.stringify({ session_id: sessionId, action: action }),
  });

  const text = await res.text().catch(() => '');
  let json: any = null;
  try {
    json = text ? JSON.parse(text) : null;
  } catch {
    // ignore JSON parse error; handled below
  }

  if (!res.ok) {
    const msg = json?.message || json?.detail || text || res.statusText;
    throw new Error(`${action} start failed (${res.status}): ${msg}`);
  }

  return {
    data: json?.data ?? null,
    message: json?.message ?? 'Thành công',
  };
}



/**
 * Real API: Upload (multipart/form-data)
 * Backend endpoint: POST {API_BASE_URL}/app/files/upload/
 * - field: files (multiple)
 */
export async function apiUpload(files: File[], settings: AppSettings): Promise<UploadResult> {
  const url = `${settings.API_BASE_URL.replace(/\/$/, '')}/app/files/upload/`;

  const form = new FormData();
  for (const f of files) form.append('files', f);

  const headers: Record<string, string> = {};
  // If later you enable auth, keep the same settings contract.
  if (settings.API_TOKEN) headers.Authorization = `Bearer ${settings.API_TOKEN}`;

  const res = await fetch(url, {
    method: 'POST',
    headers,
    body: form,
  });

  if (!res.ok) {
    const txt = await res.text().catch(() => '');
    throw new Error(`Upload failed (${res.status}): ${txt || res.statusText}`);
  }

  const data = (await res.json()) as {
    sessionId: string;
    files: Array<{ name: string; size: number; id?: number; url?: string }>;
  };

  return {
    sessionId: data.sessionId,
    files: (data.files ?? []).map((f) => ({ name: f.name, size: f.size })),
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
  // For QR/Barcode: call real API start endpoint.
  // Note: backend renames files on disk; it currently doesn't return per-file output.
  // To keep FE flow intact, we map the response to a synthetic per-file result list.
  if (action === 'qrcode' || action === 'barcode') {
    const startRes = await apiStartDetect(action, sessionId, settings);
    const results: ProcessResultItem[] = files.map((f) => ({
      inputName: f.name,
      // best-effort placeholder (backend doesn't provide output filenames yet)
      outputName: makeOutputName(action, f.name),
      ok: true,
      message: startRes.message || 'Thành công',
    }));
    return { sessionId, action, results };
  }

  // pdf2layer: keep mock behavior for now
  await sleep(Math.min(Math.max(settings.TIME_SLEEP, 200), 2000));

  const results: ProcessResultItem[] = [];
  for (const f of files) {
    await sleep(50);
    const ok = randOk(0.85);
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
