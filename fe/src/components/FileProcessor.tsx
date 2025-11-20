import { useState, useRef } from 'react';
import { FolderOpen, Play, CheckCircle, XCircle, Loader2 } from 'lucide-react';
const API_URL = "http://localhost:18000";
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
  const [allFiles, setAllFiles] = useState<string[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [logs, setLogs] = useState<LogEntry[]>([]);

  const inputRef = useRef<HTMLInputElement>(null);

  const handleSelectFolder = () => {
    inputRef.current?.click();
  };

  const handleFilesChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files) return;

    const tree: FileNode[] = [];
    const folderMap: Record<string, FileNode> = {};

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const pathParts = file.webkitRelativePath.split('/');
      let currentLevel = tree;

      for (let j = 0; j < pathParts.length; j++) {
        const part = pathParts[j];
        const isFile = j === pathParts.length - 1;

        if (isFile) {
          currentLevel.push({ name: part, type: 'file' });
        } else {
          const folderKey = pathParts.slice(0, j + 1).join('/');
          if (!folderMap[folderKey]) {
            const newFolder: FileNode = { name: part, type: 'folder', children: [] };
            folderMap[folderKey] = newFolder;
            currentLevel.push(newFolder);
          }
          currentLevel = folderMap[folderKey].children!;
        }
      }
    }

    setSelectedFolder(files[0] ? files[0].webkitRelativePath.split('/')[0] : '');
    setFileTree(tree);
    setAllFiles(extractAllFiles(tree)); // lưu danh sách file vào state
    setLogs([]);
  };

  const handleStartProcessing = async () => {
    if (!selectedFolder) return;

    setIsProcessing(true);
    setLogs([]);
    const files = extractAllFiles(fileTree);
    setAllFiles(files);

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
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

      try {
        // Gọi API POST
        const response = await fetch(`${API_URL}/app/${processType}/start/`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ file_pdf: file }),
        });
        const data = await response.json();
        console.log(data);
        if (response.ok) {
          setLogs((prev) =>
            prev.map((log) =>
              log.id === logId
                ? {
                    ...log,
                    status: 'success',
                    message: `Đổi tên thành công: ${data.data}`,
                  }
                : log
            )
          );
        } else {
          setLogs((prev) =>
            prev.map((log) =>
              log.id === logId
                ? {
                    ...log,
                    status: 'error',
                    message: `Failed to process ${file}: ${data.detail || 'Unknown error'}`,
                  }
                : log
            )
          );
        }
      } catch (error: any) {
        setLogs((prev) =>
          prev.map((log) =>
            log.id === logId
              ? {
                  ...log,
                  status: 'error',
                  message: `Failed to process ${file}: ${error.message}`,
                }
              : log
          )
        );
      }
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

  const processedCount = logs.filter((log) => log.status === 'success' || log.status === 'error').length;
  const inProgressCount = logs.filter((log) => log.status === 'processing').length;
  const progressPercent = allFiles.length ? (processedCount / allFiles.length) * 100 : 0;

  return (
    <div className="p-8">
      <input
        type="file"
        ref={inputRef}
        style={{ display: 'none' }}
        webkitdirectory="true"
        directory="true"
        onChange={handleFilesChange}
      />

      <div className="mb-8">
        <h2 className="text-3xl font-bold text-gray-800 mb-2">{title}</h2>
        <p className="text-gray-600">
          Phát hiện và đọc thông tin từ {processType}, sau đó đổi tên file
        </p>
      </div>

      <div className="grid grid-cols-2 gap-6">
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <button
            onClick={handleSelectFolder}
            disabled={isProcessing}
            className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:bg-gray-300 disabled:cursor-not-allowed mb-6"
          >
            <FolderOpen className="w-5 h-5" />
            Chọn folder
          </button>

          {selectedFolder && (
            <>
              <div className="mb-4 p-3 bg-gray-50 rounded-lg">
                <p className="text-sm text-gray-600 mb-1">Thư mục đã chọn:</p>
                <p className="text-sm font-medium text-gray-800">{selectedFolder}</p>
              </div>

              {/* Card tiến trình */}
              <div className="mb-4 p-4 bg-gray-50 rounded-lg border border-gray-200">
                <p className="text-sm text-gray-700 mb-1">
                  Đã xử lý: {processedCount} / {allFiles.length} | Đang xử lý: {inProgressCount}
                </p>
                <div className="w-full h-3 bg-gray-200 rounded-full">
                  <div
                    className="h-3 bg-green-500 rounded-full transition-all duration-300"
                    style={{ width: `${progressPercent}%` }}
                  ></div>
                </div>
              </div>

              <div className="mb-6 p-4 bg-gray-50 rounded-lg max-h-64 overflow-y-auto">
                <p className="text-sm font-medium text-gray-700 mb-3">Cây thư mục:</p>
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
                    <p className="text-xs text-gray-600 mt-1">{log.filename}</p>
                    <p className="text-sm font-medium text-gray-800 break-words">{log.message}</p>
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
