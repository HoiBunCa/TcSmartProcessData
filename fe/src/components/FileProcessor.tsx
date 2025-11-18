import { useState } from 'react';
import { FolderOpen, Play, CheckCircle, XCircle, Loader2 } from 'lucide-react';

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

interface FileProcessorProps {
  title: string;
  processType: 'qrcode' | 'barcode';
}

export default function FileProcessor({ title, processType }: FileProcessorProps) {
  const [selectedFolder, setSelectedFolder] = useState<string>('');
  const [fileTree, setFileTree] = useState<FileNode[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [logs, setLogs] = useState<LogEntry[]>([]);

  const handleSelectFolder = () => {
    const mockFolder = `/documents/${processType}_files`;
    setSelectedFolder(mockFolder);

    const mockFiles: FileNode[] = [
      {
        name: 'batch_001',
        type: 'folder',
        children: [
          { name: 'document_001.pdf', type: 'file' },
          { name: 'document_002.pdf', type: 'file' },
          { name: 'document_003.pdf', type: 'file' },
        ],
      },
      {
        name: 'batch_002',
        type: 'folder',
        children: [
          { name: 'file_a.pdf', type: 'file' },
          { name: 'file_b.pdf', type: 'file' },
        ],
      },
      { name: 'single_document.pdf', type: 'file' },
    ];

    setFileTree(mockFiles);
    setLogs([]);
  };

  const handleStartProcessing = async () => {
    setIsProcessing(true);
    setLogs([]);

    const allFiles = extractAllFiles(fileTree);

    for (let i = 0; i < allFiles.length; i++) {
      const file = allFiles[i];
      const logId = `${Date.now()}-${i}`;

      setLogs((prev) => [
        ...prev,
        {
          id: logId,
          filename: file,
          status: 'processing',
          message: `Processing ${file}...`,
          timestamp: new Date().toLocaleTimeString(),
        },
      ]);

      await new Promise((resolve) => setTimeout(resolve, 800 + Math.random() * 400));

      const success = Math.random() > 0.2;

      setLogs((prev) =>
        prev.map((log) =>
          log.id === logId
            ? {
                ...log,
                status: success ? 'success' : 'error',
                message: success
                  ? `Successfully processed ${file} - ${processType} detected and renamed`
                  : `Failed to process ${file} - ${processType} not found`,
              }
            : log
        )
      );
    }

    setIsProcessing(false);
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

  return (
    <div className="p-8">
      <div className="mb-8">
        <h2 className="text-3xl font-bold text-gray-800 mb-2">{title}</h2>
        <p className="text-gray-600">Process files and rename based on {processType}</p>
      </div>

      <div className="grid grid-cols-2 gap-6">
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-800 mb-4">File Selection</h3>

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
                onClick={handleStartProcessing}
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
    </div>
  );
}
