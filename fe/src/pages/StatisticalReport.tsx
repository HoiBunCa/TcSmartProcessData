import { useState } from 'react';
import { FileText, CheckCircle, XCircle, Clock } from 'lucide-react';

const mockData = [
  { date: '2025-01-15', processed: 45, success: 42, failed: 3 },
  { date: '2025-01-16', processed: 62, success: 60, failed: 2 },
  { date: '2025-01-17', processed: 38, success: 35, failed: 3 },
  { date: '2025-01-18', processed: 51, success: 49, failed: 2 },
  { date: '2025-01-19', processed: 47, success: 46, failed: 1 },
  { date: '2025-01-20', processed: 55, success: 53, failed: 2 },
  { date: '2025-01-21', processed: 41, success: 40, failed: 1 },
];

export default function StatisticalReport() {
  const [startDate, setStartDate] = useState('2025-01-15');
  const [endDate, setEndDate] = useState('2025-01-21');

  const filteredData = mockData.filter(
    (item) => item.date >= startDate && item.date <= endDate
  );

  const totals = filteredData.reduce(
    (acc, item) => ({
      processed: acc.processed + item.processed,
      success: acc.success + item.success,
      failed: acc.failed + item.failed,
    }),
    { processed: 0, success: 0, failed: 0 }
  );

  const maxProcessed = Math.max(...filteredData.map((d) => d.processed));

  return (
    <div className="p-8">
      <div className="mb-8">
        <h2 className="text-3xl font-bold text-gray-800 mb-2">Statistical Report</h2>
        <p className="text-gray-600">Overview of file processing activities</p>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-8">
        <div className="flex items-center gap-4 mb-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Start Date
            </label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              End Date
            </label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
        </div>

        <div className="grid grid-cols-3 gap-6">
          <div className="bg-blue-50 rounded-lg p-6">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-blue-700">Total Processed</span>
              <FileText className="w-5 h-5 text-blue-600" />
            </div>
            <p className="text-3xl font-bold text-blue-900">{totals.processed}</p>
          </div>
          <div className="bg-green-50 rounded-lg p-6">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-green-700">Successful</span>
              <CheckCircle className="w-5 h-5 text-green-600" />
            </div>
            <p className="text-3xl font-bold text-green-900">{totals.success}</p>
          </div>
          <div className="bg-red-50 rounded-lg p-6">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-red-700">Failed</span>
              <XCircle className="w-5 h-5 text-red-600" />
            </div>
            <p className="text-3xl font-bold text-red-900">{totals.failed}</p>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-800 mb-6">Processing Activity</h3>
        <div className="space-y-4">
          {filteredData.map((item) => (
            <div key={item.date} className="flex items-center gap-4">
              <div className="w-32 text-sm font-medium text-gray-700">
                {new Date(item.date).toLocaleDateString('en-US', {
                  month: 'short',
                  day: 'numeric',
                })}
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <div className="flex-1 bg-gray-100 rounded-full h-8 overflow-hidden">
                    <div className="flex h-full">
                      <div
                        className="bg-green-500"
                        style={{
                          width: `${(item.success / maxProcessed) * 100}%`,
                        }}
                      />
                      <div
                        className="bg-red-500"
                        style={{
                          width: `${(item.failed / maxProcessed) * 100}%`,
                        }}
                      />
                    </div>
                  </div>
                  <span className="text-sm font-medium text-gray-700 w-12">
                    {item.processed}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
        <div className="flex items-center gap-6 mt-6 pt-6 border-t border-gray-200">
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-green-500 rounded" />
            <span className="text-sm text-gray-600">Success</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-red-500 rounded" />
            <span className="text-sm text-gray-600">Failed</span>
          </div>
        </div>
      </div>
    </div>
  );
}
