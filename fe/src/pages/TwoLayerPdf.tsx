import { useState } from 'react';
import { FolderOpen, Play, Download, CheckCircle, XCircle, Loader2, ArrowRight } from 'lucide-react';

interface LogEntry {
  id: string;
  filename: string;
  status: 'processing' | 'success' | 'error';
  message: string;
  timestamp: string;
}

interface FileNode {
  name: string;
  type: 'file' | 'folder';
  children?: FileNode[];
}

export default function TwoLayerPdf() {
  const [currentStep, setCurrentStep] = useState<1 | 2>(1);
  const [selectedFolder, setSelectedFolder] = useState<string>('');
  const [fileTree, setFileTree] = useState<FileNode[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [step2Logs, setStep2Logs] = useState<LogEntry[]>([]);
  const [isDownloading, setIsDownloading] = useState(false);

  const handleSelectFolder = () => {
    const mockFolder = '/documents/pdf_files';
    setSelectedFolder(mockFolder);

    const mockFiles: FileNode[] = [
      {
        name: 'invoices',
        type: 'folder',
        children: [
          { name: 'invoice_001.pdf', type: 'file' },
          { name: 'invoice_002.pdf', type: 'file' },
          { name: 'invoice_003.pdf', type: 'file' },
        ],
      },
      {
        name: 'contracts',
        type: 'folder',
        children: [
          { name: 'contract_a.pdf', type: 'file' },
          { name: 'contract_b.pdf', type: 'file' },
        ],
      },
      { name: 'report.pdf', type: 'file' },
    ];

    setFileTree(mockFiles);
    setLogs([]);
  };

  const handleStartStep1 = async () => {
    setIsProcessing(true);
    setLogs([]);

    const allFiles = extractAllFiles(fileTree);

    for (let i = 0; i < allFiles.length; i++) {
      const file = allFiles[i];
      const logId = `step1-${Date.now()}-${i}`;

      setLogs((prev) => [
        ...prev,
        {
          id: logId,
          filename: file,
          status: 'processing',
          message: `Processing ${file} - extracting layers...`,
          timestamp: new Date().toLocaleTimeString(),
        },
      ]);

      await new Promise((resolve) => setTimeout(resolve, 900 + Math.random() * 600));

      const success = Math.random() > 0.15;

      setLogs((prev) =>
        prev.map((log) =>
          log.id === logId
            ? {
                ...log,
                status: success ? 'success' : 'error',
                message: success
                  ? `Successfully processed ${file} - layers extracted`
                  : `Failed to process ${file} - invalid PDF structure`,
              }
            : log
        )
      );
    }

    setIsProcessing(false);
    setCurrentStep(2);
  };

  const handleDownload = async () => {
    setIsDownloading(true);
    setStep2Logs([]);

    const processedFiles = logs.filter((log) => log.status === 'success');

    for (let i = 0; i < processedFiles.length; i++) {
      const file = processedFiles[i];
      const logId = `step2-${Date.now()}-${i}`;

      setStep2Logs((prev) => [
        ...prev,
        {
          id: logId,
          filename: file.filename,
          status: 'processing',
          message: `Generating 2-layer PDF for ${file.filename}...`,
          timestamp: new Date().toLocaleTimeString(),
        },
      ]);

      await new Promise((resolve) => setTimeout(resolve, 1000 + Math.random() * 800));

      const success = Math.random() > 0.1;

      setStep2Logs((prev) =>
        prev.map((log) =>
          log.id === logId
            ? {
                ...log,
                status: success ? 'success' : 'error',
                message: success
                  ? `Successfully generated ${file.filename} - ready for download`
                  : `Failed to generate ${file.filename} - compression error`,
              }
            : log
        )
      );
    }

    setIsDownloading(false);
  };

  const extractAllFiles = (nodes: FileNode[], prefix = ''): string[] => {
    let files: string[] = [];
    for (const node of nodes) {
      const path = prefix ? `${prefix}/${node.name}` : node.name;
      if (node.type === 'file') {
        files.push(path);
      } else if (node.children) {
        files = files.concat(extractAllFiles(node.children, path));
      }
    }
    return files;
  };

  const renderFileTree = (nodes: FileNode[], level = 0) => {
    return nodes.map((node, index) => (
      <div key={index} style={{ marginLeft: `${level * 20}px` }}>
        <div className="flex items-center gap-2 py-1 text-sm text-gray-700">
          {node.type === 'folder' ? (
            <>
              <FolderOpen className="w-4 h-4 text-blue-500" />
              <span className="font-medium">{node.name}</span>
            </>
          ) : (
            <>
              <div className="w-4 h-4 flex items-center justify-center">
                <div className="w-1 h-1 bg-gray-400 rounded-full" />
              </div>
              <span>{node.name}</span>
            </>
          )}
        </div>
        {node.children && renderFileTree(node.children, level + 1)}
      </div>
    ));
  };

  const resetProcess = () => {
    setCurrentStep(1);
    setSelectedFolder('');
    setFileTree([]);
    setLogs([]);
    setStep2Logs([]);
  };

  return (
    <div className="p-8">
      <div className="mb-8">
        <h2 className="text-3xl font-bold text-gray-800 mb-2">2-Layer PDF</h2>
        <p className="text-gray-600">Process PDFs into 2-layer format</p>
      </div>

      <div className="mb-6 flex items-center gap-4">
        <div className="flex items-center gap-3">
          <div
            className={`w-10 h-10 rounded-full flex items-center justify-center font-semibold ${
              currentStep === 1
                ? 'bg-blue-600 text-white'
                : 'bg-green-500 text-white'
            }`}
          >
            {currentStep === 1 ? '1' : <CheckCircle className="w-5 h-5" />}
          </div>
          <span className="font-medium text-gray-700">Extract Layers</span>
        </div>
        <ArrowRight className="w-5 h-5 text-gray-400" />
        <div className="flex items-center gap-3">
          <div
            className={`w-10 h-10 rounded-full flex items-center justify-center font-semibold ${
              currentStep === 2
                ? 'bg-blue-600 text-white'
                : 'bg-gray-300 text-gray-600'
            }`}
          >
            2
          </div>
          <span className="font-medium text-gray-700">Generate & Download</span>
        </div>
        {currentStep === 2 && (
          <button
            onClick={resetProcess}
            className="ml-auto px-4 py-2 text-sm text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-lg transition-colors"
          >
            Reset
          </button>
        )}
      </div>

      {currentStep === 1 && (
        <div className="grid grid-cols-2 gap-6">
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-800 mb-4">
              Step 1: File Selection
            </h3>

            <button
              onClick={handleSelectFolder}
              disabled={isProcessing}
              className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:bg-gray-300 disabled:cursor-not-allowed mb-6"
            >
              <FolderOpen className="w-5 h-5" />
              Select Folder
            </button>

            {selectedFolder && (
              <>
                <div className="mb-4 p-3 bg-gray-50 rounded-lg">
                  <p className="text-sm text-gray-600 mb-1">Selected folder:</p>
                  <p className="text-sm font-medium text-gray-800">{selectedFolder}</p>
                </div>

                <div className="mb-6 p-4 bg-gray-50 rounded-lg max-h-64 overflow-y-auto">
                  <p className="text-sm font-medium text-gray-700 mb-3">Directory Tree:</p>
                  {renderFileTree(fileTree)}
                </div>

                <button
                  onClick={handleStartStep1}
                  disabled={isProcessing}
                  className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:bg-gray-300 disabled:cursor-not-allowed"
                >
                  {isProcessing ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      Processing...
                    </>
                  ) : (
                    <>
                      <Play className="w-5 h-5" />
                      Start Processing
                    </>
                  )}
                </button>
              </>
            )}
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-800 mb-4">Processing Log</h3>

            <div className="space-y-2 max-h-[600px] overflow-y-auto">
              {logs.length === 0 ? (
                <p className="text-sm text-gray-500 text-center py-8">
                  No logs yet. Select a folder and start processing.
                </p>
              ) : (
                logs.map((log) => (
                  <div
                    key={log.id}
                    className="flex items-start gap-3 p-3 rounded-lg bg-gray-50 border border-gray-200"
                  >
                    {log.status === 'processing' && (
                      <Loader2 className="w-4 h-4 text-blue-500 animate-spin flex-shrink-0 mt-0.5" />
                    )}
                    {log.status === 'success' && (
                      <CheckCircle className="w-4 h-4 text-green-500 flex-shrink-0 mt-0.5" />
                    )}
                    {log.status === 'error' && (
                      <XCircle className="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5" />
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-800 break-words">
                        {log.filename}
                      </p>
                      <p className="text-xs text-gray-600 mt-1">{log.message}</p>
                      <p className="text-xs text-gray-500 mt-1">{log.timestamp}</p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {currentStep === 2 && (
        <div className="grid grid-cols-2 gap-6">
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-800 mb-4">
              Step 2: Generate 2-Layer PDFs
            </h3>

            <div className="mb-6 p-4 bg-blue-50 rounded-lg">
              <p className="text-sm text-gray-700 mb-2">
                <span className="font-semibold">Step 1 Complete!</span>
              </p>
              <p className="text-sm text-gray-600">
                {logs.filter((log) => log.status === 'success').length} files ready for
                processing
              </p>
            </div>

            <button
              onClick={handleDownload}
              disabled={isDownloading}
              className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:bg-gray-300 disabled:cursor-not-allowed"
            >
              {isDownloading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Generating...
                </>
              ) : (
                <>
                  <Download className="w-5 h-5" />
                  Download & Process
                </>
              )}
            </button>

            <div className="mt-6 p-4 bg-gray-50 rounded-lg">
              <p className="text-xs text-gray-600">
                This will generate 2-layer PDFs with searchable text overlay for all
                successfully processed files from Step 1.
              </p>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-800 mb-4">
              Generation Log
            </h3>

            <div className="space-y-2 max-h-[600px] overflow-y-auto">
              {step2Logs.length === 0 ? (
                <p className="text-sm text-gray-500 text-center py-8">
                  Click "Download & Process" to start generating 2-layer PDFs.
                </p>
              ) : (
                step2Logs.map((log) => (
                  <div
                    key={log.id}
                    className="flex items-start gap-3 p-3 rounded-lg bg-gray-50 border border-gray-200"
                  >
                    {log.status === 'processing' && (
                      <Loader2 className="w-4 h-4 text-blue-500 animate-spin flex-shrink-0 mt-0.5" />
                    )}
                    {log.status === 'success' && (
                      <CheckCircle className="w-4 h-4 text-green-500 flex-shrink-0 mt-0.5" />
                    )}
                    {log.status === 'error' && (
                      <XCircle className="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5" />
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-800 break-words">
                        {log.filename}
                      </p>
                      <p className="text-xs text-gray-600 mt-1">{log.message}</p>
                      <p className="text-xs text-gray-500 mt-1">{log.timestamp}</p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
