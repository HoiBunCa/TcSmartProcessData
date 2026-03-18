import { useMemo, useRef, useState } from 'react';
import {
  UploadCloud,
  FileUp,
  Play,
  Download,
  CheckCircle,
  XCircle,
  Loader2,
  QrCode,
  Barcode,
  FileType,
} from 'lucide-react';
import {
  loadSettings,
  mockDownload,
  mockProcess,
  apiUpload,
  ProcessAction,
  ProcessResultItem,
  LogEntry,
} from './mockApi';

type Step = 1 | 2;

type Status =
  | 'idle'
  | 'ready'
  | 'uploading'
  | 'uploaded'
  | 'processing'
  | 'processed'
  | 'downloading'
  | 'done'
  | 'error';

function nowTs() {
  return new Date().toLocaleTimeString();
}

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

function humanSize(bytes: number) {
  if (!bytes) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB'];
  const i = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
  const v = bytes / 1024 ** i;
  return `${v.toFixed(v >= 10 || i === 0 ? 0 : 1)} ${units[i]}`;
}

export default function UnifiedFileWorkflow() {
  const settings = useMemo(() => loadSettings(), []);

  const inputFilesRef = useRef<HTMLInputElement>(null);
  const inputFolderRef = useRef<HTMLInputElement>(null);

  const [step, setStep] = useState<Step>(1);
  const [status, setStatus] = useState<Status>('idle');

  const [pickedFiles, setPickedFiles] = useState<File[]>([]);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [uploadedFiles, setUploadedFiles] = useState<Array<{ name: string; size: number }>>([]);

  const [selectedAction, setSelectedAction] = useState<ProcessAction | null>(null);
  const [processResults, setProcessResults] = useState<ProcessResultItem[]>([]);

  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [isDragging, setIsDragging] = useState(false);

  const appendLog = (entry: Omit<LogEntry, 'id' | 'ts'>) => {
    setLogs((prev) => [
      ...prev,
      {
        id: `${Date.now()}_${Math.random().toString(16).slice(2)}`,
        ts: nowTs(),
        ...entry,
      },
    ]);
  };

  const totalSize = useMemo(() => pickedFiles.reduce((acc, f) => acc + f.size, 0), [pickedFiles]);
  const canUpload = pickedFiles.length > 0 && status !== 'uploading' && status !== 'processing';
  const canProcess =
    step === 2 &&
    !!sessionId &&
    uploadedFiles.length > 0 &&
    !!selectedAction &&
    status !== 'processing' &&
    status !== 'uploading' &&
    status !== 'downloading';
  const canDownload =
    step === 2 &&
    status === 'processed' &&
    !!sessionId &&
    !!selectedAction &&
    processResults.length > 0;

  const handlePickFiles = () => inputFilesRef.current?.click();
  const handlePickFolder = () => inputFolderRef.current?.click();

  const normalizePicked = (files: FileList | null) => {
    if (!files || files.length === 0) return;

    const list = Array.from(files).filter(
      (f) => !f.name.startsWith('.') && !f.name.toLowerCase().includes('.ds_store')
    );
    setPickedFiles(list);
    setStatus(list.length ? 'ready' : 'idle');
    setStep(1);
    setSessionId(null);
    setUploadedFiles([]);
    setSelectedAction(null);
    setProcessResults([]);
    setLogs([]);
  };

  const handleUpload = async () => {
    if (!canUpload) return;
    try {
      setStatus('uploading');
      appendLog({ status: 'processing', title: 'UPLOAD', detail: `Uploading ${pickedFiles.length} file(s)...` });
      const res = await apiUpload(pickedFiles, settings);
      setSessionId(res.sessionId);
      setUploadedFiles(res.files);
      setStatus('uploaded');
      setStep(2);
      appendLog({
        status: 'success',
        title: 'UPLOAD_SUCCESS',
        detail: `sessionId=${res.sessionId}. Uploaded ${res.files.length} file(s).`,
      });
    } catch (e: any) {
      setStatus('error');
      appendLog({ status: 'error', title: 'UPLOAD_ERROR', detail: e?.message ?? String(e) });
    }
  };

  const handleProcess = async (action: ProcessAction) => {
    if (!sessionId) return;
    try {
      setSelectedAction(action);
      setStatus('processing');
      setProcessResults([]);

      appendLog({
        status: 'processing',
        title: 'PROCESS',
        detail: `Action=${action}. Processing ${uploadedFiles.length} file(s)...`,
      });

      const res = await mockProcess(sessionId, action, uploadedFiles, settings);
      setProcessResults(res.results);
      setStatus('processed');
      appendLog({
        status: 'success',
        title: 'PROCESS_DONE',
        detail: `Done. Success=${res.results.filter((r) => r.ok).length}, Failed=${res.results.filter((r) => !r.ok).length}`, 
      });
    } catch (e: any) {
      setStatus('error');
      appendLog({ status: 'error', title: 'PROCESS_ERROR', detail: e?.message ?? String(e) });
    }
  };

  const handleDownload = async () => {
    if (!sessionId || !selectedAction) return;
    try {
      setStatus('downloading');
      appendLog({ status: 'processing', title: 'DOWNLOAD', detail: 'Generating download package (mock)...' });
      const res = await mockDownload(sessionId, selectedAction, processResults, settings);
      downloadBlob(res.blob, res.filename);
      setStatus('done');
      appendLog({ status: 'success', title: 'DOWNLOAD_DONE', detail: `Downloaded: ${res.filename}` });
    } catch (e: any) {
      setStatus('error');
      appendLog({ status: 'error', title: 'DOWNLOAD_ERROR', detail: e?.message ?? String(e) });
    }
  };

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    normalizePicked(e.dataTransfer.files);
  };

  const actionCards = useMemo(
    () => [
      {
        id: 'qrcode' as const,
        label: 'QR detect',
        desc: 'Đổi tên file theo QR code (mock)',
        icon: QrCode,
      },
      {
        id: 'barcode' as const,
        label: 'Barcode detect',
        desc: 'Đổi tên file theo Barcode (mock)',
        icon: Barcode,
      },
      {
        id: 'pdf2layer' as const,
        label: 'PDF 2 layer',
        desc: 'Tạo PDF 2 lớp (mock, chỉ 1 API)',
        icon: FileType,
      },
    ],
    []
  );

  return (
    <div className="p-8">
      <div className="mb-8">
        <h2 className="text-3xl font-bold text-gray-800 mb-2">Xử lý file</h2>
        <p className="text-gray-600">
          Gộp 3 chức năng vào 1 màn hình: Upload → chọn tác vụ → xem log → tải kết quả (mock).
        </p>
      </div>

      <div className="mb-6 flex items-center gap-3">
        <div
          className={`w-9 h-9 rounded-full flex items-center justify-center font-semibold ${
            step === 1 ? 'bg-blue-600 text-white' : 'bg-green-500 text-white'
          }`}
        >
          {step === 1 ? '1' : <CheckCircle className="w-5 h-5" />}
        </div>
        <span className="font-medium text-gray-700">Upload</span>
        <div className="w-10 h-px bg-gray-300" />
        <div
          className={`w-9 h-9 rounded-full flex items-center justify-center font-semibold ${
            step === 2 ? 'bg-blue-600 text-white' : 'bg-gray-300 text-gray-700'
          }`}
        >
          2
        </div>
        <span className="font-medium text-gray-700">Chọn tác vụ & Tải kết quả</span>
      </div>

      {/* Top section: Upload + Options */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Upload card */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-800 mb-4">Bước 1: Kéo thả / chọn file hoặc folder</h3>

          <div
            onDragOver={(e) => {
              e.preventDefault();
              setIsDragging(true);
            }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={onDrop}
            className={`border-2 border-dashed rounded-xl p-6 transition-colors ${
              isDragging ? 'border-blue-500 bg-blue-50' : 'border-gray-300 bg-gray-50'
            }`}
          >
            <div className="flex items-center gap-3">
              <UploadCloud className="w-6 h-6 text-blue-600" />
              <div>
                <p className="font-medium text-gray-800">Thả file/folder vào đây</p>
                <p className="text-sm text-gray-600">Hoặc dùng nút bên dưới để chọn</p>
              </div>
            </div>

            <div className="mt-4 flex flex-wrap gap-3">
              <button
                type="button"
                onClick={handlePickFiles}
                disabled={status === 'uploading' || status === 'processing' || status === 'downloading'}
                className="inline-flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:bg-gray-100 disabled:text-gray-400"
              >
                <FileUp className="w-4 h-4" />
                Chọn file
              </button>

              <button
                type="button"
                onClick={handlePickFolder}
                disabled={status === 'uploading' || status === 'processing' || status === 'downloading'}
                className="inline-flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:bg-gray-100 disabled:text-gray-400"
              >
                <FileUp className="w-4 h-4" />
                Chọn folder
              </button>
            </div>

            <input
              ref={inputFilesRef}
              type="file"
              multiple
              className="hidden"
              onChange={(e) => normalizePicked(e.target.files)}
            />
            <input
              ref={inputFolderRef}
              type="file"
              multiple
              // eslint-disable-next-line @typescript-eslint/ban-ts-comment
              // @ts-ignore - webkitdirectory is supported by Chromium-based browsers
              webkitdirectory="true"
              className="hidden"
              onChange={(e) => normalizePicked(e.target.files)}
            />
          </div>

          <div className="mt-5">
            {pickedFiles.length === 0 ? (
              <p className="text-sm text-gray-500">Chưa có file nào được chọn</p>
            ) : (
              <div className="p-3 bg-gray-50 border border-gray-200 rounded-lg">
                <p className="text-sm text-gray-700">
                  Đã chọn: <span className="font-semibold">{pickedFiles.length}</span> file(s) — Tổng dung lượng:{' '}
                  <span className="font-semibold">{humanSize(totalSize)}</span>
                </p>
                <p className="text-xs text-gray-500 mt-1">Upload thật: sẽ gửi file lên backend và lưu vào media/</p>
              </div>
            )}
          </div>

          <button
            type="button"
            onClick={handleUpload}
            disabled={!canUpload}
            className="mt-5 w-full inline-flex items-center justify-center gap-2 px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed"
          >
            {status === 'uploading' ? <Loader2 className="w-5 h-5 animate-spin" /> : <UploadCloud className="w-5 h-5" />}
            Tải lên
          </button>

          {sessionId && (
            <div className="mt-4 text-xs text-gray-500">
              sessionId: <span className="font-mono">{sessionId}</span>
            </div>
          )}
        </div>

        {/* Options card */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-800 mb-4">Bước 2: Chọn tác vụ (chỉ 1)</h3>
          <p className="text-sm text-gray-600 mb-4">
            Bấm 1 option để gọi mock API xử lý toàn bộ file trong phiên.
          </p>

          <div className="grid grid-cols-1 gap-3">
            {actionCards.map((a) => {
              const Icon = a.icon;
              const active = selectedAction === a.id;
              const disabled = step !== 2 || status === 'uploading' || status === 'processing' || status === 'downloading' || !sessionId;
              return (
                <button
                  key={a.id}
                  type="button"
                  disabled={disabled}
                  onClick={() => handleProcess(a.id)}
                  className={`text-left p-4 rounded-xl border transition-colors disabled:bg-gray-100 disabled:text-gray-400 ${
                    active ? 'border-blue-600 bg-blue-50' : 'border-gray-200 hover:bg-gray-50'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <Icon className={`w-5 h-5 mt-0.5 ${active ? 'text-blue-700' : 'text-gray-600'}`} />
                    <div className="flex-1">
                      <div className="flex items-center justify-between gap-3">
                        <p className="font-semibold">{a.label}</p>
                        {status === 'processing' && active && <Loader2 className="w-4 h-4 animate-spin text-blue-600" />}
                      </div>
                      <p className="text-sm text-gray-600 mt-1">{a.desc}</p>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>

          <div className="mt-4 p-3 bg-gray-50 border border-gray-200 rounded-lg text-sm text-gray-700">
            <p>
              Trạng thái: <span className="font-semibold">{status}</span>
            </p>
            <p className="text-xs text-gray-500 mt-1">
              TIME_SLEEP (mock): <span className="font-mono">{settings.TIME_SLEEP}ms</span>
            </p>
          </div>

          <button
            type="button"
            onClick={() => selectedAction && handleProcess(selectedAction)}
            disabled={!canProcess}
            className="mt-5 w-full inline-flex items-center justify-center gap-2 px-4 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:bg-gray-300 disabled:cursor-not-allowed"
          >
            {status === 'processing' ? <Loader2 className="w-5 h-5 animate-spin" /> : <Play className="w-5 h-5" />}
            Chạy lại tác vụ đang chọn
          </button>
        </div>
      </div>

      {/* Logs + Download */}
      <div className="mt-6 grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-800 mb-4">Log call API</h3>
          <div className="space-y-2 max-h-[420px] overflow-y-auto">
            {logs.length === 0 ? (
              <p className="text-sm text-gray-500 text-center py-10">
                Chưa có log. Hãy upload và chọn tác vụ.
              </p>
            ) : (
              logs.map((l) => (
                <div key={l.id} className="flex items-start gap-3 p-3 rounded-lg bg-gray-50 border border-gray-200">
                  {l.status === 'processing' && <Loader2 className="w-4 h-4 mt-0.5 animate-spin text-blue-600" />}
                  {l.status === 'success' && <CheckCircle className="w-4 h-4 mt-0.5 text-green-600" />}
                  {l.status === 'error' && <XCircle className="w-4 h-4 mt-0.5 text-red-600" />}
                  {l.status === 'info' && <div className="w-4 h-4 mt-1 rounded-full bg-gray-400" />}
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-3">
                      <p className="text-sm font-semibold text-gray-800 truncate">{l.title}</p>
                      <p className="text-xs text-gray-500 flex-shrink-0">{l.ts}</p>
                    </div>
                    {l.detail && <p className="text-sm text-gray-700 mt-1 break-words">{l.detail}</p>}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-800 mb-4">Xác nhận / Tải file</h3>
          <p className="text-sm text-gray-600">
            Nút này sẽ call <span className="font-mono">mockDownload</span> và tải về 1 file JSON mô phỏng package kết quả.
          </p>

          <div className="mt-4 p-3 bg-gray-50 border border-gray-200 rounded-lg text-sm">
            <p className="text-gray-700">
              Action: <span className="font-semibold">{selectedAction ?? '—'}</span>
            </p>
            <p className="text-gray-700 mt-1">
              Kết quả: <span className="font-semibold">{processResults.length}</span> item(s)
            </p>
          </div>

          <button
            type="button"
            onClick={handleDownload}
            disabled={!canDownload}
            className="mt-5 w-full inline-flex items-center justify-center gap-2 px-4 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:bg-gray-300 disabled:cursor-not-allowed"
          >
            {status === 'downloading' ? <Loader2 className="w-5 h-5 animate-spin" /> : <Download className="w-5 h-5" />}
            Tải file (Xác nhận)
          </button>

          <div className="mt-4 text-xs text-gray-500">
            Gợi ý: bạn có thể chỉnh TIME_SLEEP trong màn Cài đặt để thấy log chạy chậm/nhanh.
          </div>
        </div>
      </div>
    </div>
  );
}
