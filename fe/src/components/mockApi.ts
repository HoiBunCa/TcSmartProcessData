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
    // Backend expects both session_id and action (used as output folder name)
    body: JSON.stringify({ session_id: sessionId, action }),
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

async function apiPdf2Layer(sessionId: string, settings: AppSettings): Promise<{ message: string }> {
  const url = withBaseUrl(settings.API_BASE_URL, '/app/aidoc/pdf2layer/');

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  if (settings.API_TOKEN) headers.Authorization = `Bearer ${settings.API_TOKEN}`;

  // Backend expects {session_id, action}. Here action is the output folder name.
  const res = await fetch(url, {
    method: 'POST',
    headers,
    body: JSON.stringify({ session_id: sessionId, action: 'pdf2layer' }),
  });

  const text = await res.text().catch(() => '');
  let json: any = null;
  try {
    json = text ? JSON.parse(text) : null;
  } catch {
    // ignore
  }

  if (!res.ok) {
    const msg = json?.message || json?.detail || text || res.statusText;
    throw new Error(`pdf2layer failed (${res.status}): ${msg}`);
  }

  return { message: json?.message ?? json?.status ?? 'Thành công' };
}

function parseFilenameFromContentDisposition(cd: string | null) {
  if (!cd) return null;
  // Examples:
  // - attachment; filename="abc.zip"
  // - attachment; filename=abc.zip
  // - attachment; filename*=UTF-8''abc%20def.zip
  const filenameStar = cd.match(/filename\*=(?:UTF-8''|)([^;]+)/i);
  if (filenameStar?.[1]) {
    const raw = filenameStar[1].trim().replace(/^"|"$/g, '');
    try {
      return decodeURIComponent(raw);
    } catch {
      return raw;
    }
  }
  const filename = cd.match(/filename=([^;]+)/i);
  if (filename?.[1]) return filename[1].trim().replace(/^"|"$/g, '');
  return null;
}

async function apiDownloadResult(
  sessionId: string,
  action: ProcessAction,
  settings: AppSettings
): Promise<DownloadResult> {
  const url = withBaseUrl(settings.API_BASE_URL, '/app/download/result/');
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  if (settings.API_TOKEN) headers.Authorization = `Bearer ${settings.API_TOKEN}`;

  const res = await fetch(url, {
    method: 'POST',
    headers,
    body: JSON.stringify({ session_id: sessionId, action }),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => '');
    let json: any = null;
    try {
      json = text ? JSON.parse(text) : null;
    } catch {
      // ignore
    }
    const msg = json?.message || json?.detail || text || res.statusText;
    throw new Error(`Download failed (${res.status}): ${msg}`);
  }

  const blob = await res.blob();
  const cd = res.headers.get('content-disposition');
  const filename =
    parseFilenameFromContentDisposition(cd) || `result_${action}_${sessionId}`;

  return { sessionId, filename, blob };
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
  // QR/Barcode: call real API start endpoint.
  // Note: backend creates files under /{action}/ folder; it doesn't return per-file output.
  // We keep FE flow intact by mapping to a synthetic per-file result list.
  if (action === 'qrcode' || action === 'barcode') {
    const startRes = await apiStartDetect(action, sessionId, settings);
    const mapped: ProcessResultItem[] = files.map((f) => ({
      inputName: f.name,
      outputName: makeOutputName(action, f.name),
      ok: true,
      message: startRes.message || 'Thành công',
    }));
    return { sessionId, action, results: mapped };
  }

  // pdf2layer: call real API
  if (action === 'pdf2layer') {
    const pdf2Res = await apiPdf2Layer(sessionId, settings);
    const mapped: ProcessResultItem[] = files.map((f) => ({
      inputName: f.name,
      outputName: makeOutputName(action, f.name),
      ok: true,
      message: pdf2Res.message,
    }));
    return { sessionId, action, results: mapped };
  }

  // Fallback (shouldn't happen)
  await sleep(Math.min(Math.max(settings.TIME_SLEEP, 200), 2000));
  return { sessionId, action, results: [] };
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
  // Download real result package from backend (zip folder by action)
  if (action === 'qrcode' || action === 'barcode' || action === 'pdf2layer') {
    return apiDownloadResult(sessionId, action, settings);
  }


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
