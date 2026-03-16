import { useMemo, useState } from 'react';
import { Save, RotateCcw } from 'lucide-react';
import { AppSettings, loadSettings, saveSettings } from './mockApi';

export default function Settings() {
  const initial = useMemo(() => loadSettings(), []);
  const [settings, setSettings] = useState<AppSettings>(initial);
  const [savedAt, setSavedAt] = useState<string | null>(null);

  const handleSave = () => {
    saveSettings(settings);
    setSavedAt(new Date().toLocaleString());
  };

  const handleReset = () => {
    const defaults: AppSettings = {
      API_TOKEN: '',
      TIME_SLEEP: 600,
      API_BASE_URL: 'http://localhost:8000',
    };
    setSettings(defaults);
    saveSettings(defaults);
    setSavedAt(new Date().toLocaleString());
  };

  const timeSleepHint = useMemo(() => {
    if (settings.TIME_SLEEP < 0) return 'TIME_SLEEP phải >= 0';
    if (settings.TIME_SLEEP > 60_000) return 'TIME_SLEEP quá lớn (gợi ý <= 60000ms)';
    return 'Độ trễ mock API (ms), dùng để mô phỏng backend xử lý';
  }, [settings.TIME_SLEEP]);

  return (
    <div className="p-8">
      <div className="mb-8">
        <h2 className="text-3xl font-bold text-gray-800 mb-2">Cài đặt</h2>
        <p className="text-gray-600">Cấu hình một số giá trị dùng khi gọi API (hiện đang mock)</p>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 max-w-3xl">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">API_BASE_URL</label>
            <input
              value={settings.API_BASE_URL}
              onChange={(e) => setSettings((s) => ({ ...s, API_BASE_URL: e.target.value }))}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="http://localhost:8000"
            />
            <p className="mt-2 text-xs text-gray-500">Để sẵn cho backend thật sau này</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">API_TOKEN</label>
            <input
              value={settings.API_TOKEN}
              onChange={(e) => setSettings((s) => ({ ...s, API_TOKEN: e.target.value }))}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Bearer ..."
            />
            <p className="mt-2 text-xs text-gray-500">Để sẵn cho backend thật sau này</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">TIME_SLEEP (ms)</label>
            <input
              type="number"
              value={settings.TIME_SLEEP}
              onChange={(e) =>
                setSettings((s) => ({ ...s, TIME_SLEEP: Number(e.target.value) }))
              }
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              min={0}
            />
            <p className="mt-2 text-xs text-gray-500">{timeSleepHint}</p>
          </div>
        </div>

        <div className="mt-8 flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={handleSave}
            className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            <Save className="w-4 h-4" />
            Lưu
          </button>

          <button
            type="button"
            onClick={handleReset}
            className="inline-flex items-center gap-2 px-4 py-2 bg-gray-100 text-gray-800 rounded-lg hover:bg-gray-200"
          >
            <RotateCcw className="w-4 h-4" />
            Reset về mặc định
          </button>

          {savedAt && <span className="text-xs text-gray-500">Đã lưu: {savedAt}</span>}
        </div>
      </div>
    </div>
  );
}
