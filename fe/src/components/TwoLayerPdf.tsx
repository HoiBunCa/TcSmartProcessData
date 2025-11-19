import {useState, useRef, useEffect} from 'react';
import {FolderOpen, Play, Download, CheckCircle, XCircle, Loader2, ArrowRight} from 'lucide-react';

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
    const [allFiles, setAllFiles] = useState<string[]>([]); // Added to track all files
    const [isProcessing, setIsProcessing] = useState(false);
    const [logs, setLogs] = useState<LogEntry[]>([]);
    const [step2Logs, setStep2Logs] = useState<LogEntry[]>([]);
    const [isDownloading, setIsDownloading] = useState(false);
    const [folderId, setFolderId] = useState<string | null>(null);
    const [totalFiles, setTotalFiles] = useState<number | null>(null);

    const inputRef = useRef<HTMLInputElement>(null); // Ref for the hidden file input

    const intervalRef = useRef<any>(null);
    useEffect(() => {
        let isRunning = false;
        if (folderId === null || totalFiles === null) { return; }
        intervalRef.current = setInterval(async () => {
            if (isRunning) return;
            isRunning = true;

            try {
                const res = await fetch(`http://0.0.0.0:8000/app/aidoc/check_ocr_done/?folder_id=${folderId}&total_files=${totalFiles}`);
                const data = await res.json();
                console.log(data);
                if (data.status === "ok" && data.data === "ocr done") {
                    clearInterval(intervalRef.current);
                    console.log("Stopped polling because OCR is done!");
                    setCurrentStep(2);
                }
            } catch (e) {
                console.error(e);
            } finally {
                isRunning = false;
            }
        }, 5000);

        return () => clearInterval(intervalRef.current);
    }, [folderId, totalFiles]);

    const handleSelectFolder = () => {
        inputRef.current?.click(); // Trigger the hidden file input click
    };

    const handleFilesChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        const files = event.target.files;
        if (!files || files.length === 0) return;

        const tree: FileNode[] = [];
        const folderMap: Record<string, FileNode> = {};
        const extractedFiles: string[] = []; // To store all file paths

        // Determine the base folder name from the first file's webkitRelativePath
        const baseFolderName = files[0].webkitRelativePath.split('/')[0];
        setSelectedFolder(baseFolderName);
        setTotalFiles(files.length);

        for (let i = 0; i < files.length; i++) {
            const file = files[i];
            const pathParts = file.webkitRelativePath.split('/');
            let currentLevel = tree;

            for (let j = 0; j < pathParts.length; j++) {
                const part = pathParts[j];
                const isFile = j === pathParts.length - 1;

                if (isFile) {
                    currentLevel.push({name: part, type: 'file'});
                    extractedFiles.push(file.webkitRelativePath); // Add full path to extractedFiles
                } else {
                    const folderKey = pathParts.slice(0, j + 1).join('/');
                    if (!folderMap[folderKey]) {
                        const newFolder: FileNode = {name: part, type: 'folder', children: []};
                        folderMap[folderKey] = newFolder;
                        currentLevel.push(newFolder);
                    }
                    currentLevel = folderMap[folderKey].children!;
                }
            }
        }

        setFileTree(tree);
        setAllFiles(extractedFiles); // Set the list of all files
        setLogs([]); // Clear logs on new folder selection
        setStep2Logs([]); // Clear step 2 logs as well
        setCurrentStep(1); // Reset to step 1
    };

    const handleCreateFolderAiDoc = async () => {
        const response = await fetch(`http://0.0.0.0:8000/app/aidoc/create_folder_aidoc/`, {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
        });
        const data = await response.json();
        return data.folder_id;
    }

    const handleStartStep1 = async () => {
        if (!selectedFolder || allFiles.length === 0) return;

        setIsProcessing(true);
        setLogs([]);

        const folderIdLocal = await handleCreateFolderAiDoc();
        setFolderId(folderIdLocal);

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

            try {
                // Gọi API POST
                const response = await fetch(`http://0.0.0.0:8000/app/aidoc/upload_aidoc/`, {
                    method: 'POST',
                    headers: {'Content-Type': 'application/json'},
                    body: JSON.stringify({
                        file_pdf: file,
                        folder_id: folderIdLocal
                    }),
                });
                const data = await response.json();
                if (response.ok) {
                    setLogs((prev) =>
                        prev.map((log) =>
                            log.id === logId
                                ? {
                                    ...log,
                                    status: 'success',
                                    message: `Tải lên xử lý thành công`,
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

    const handleDownload = async () => {
        setIsDownloading(true);
        setStep2Logs([]);

        const processedFiles = logs.filter((log) => log.status === 'success');

        await fetch(`http://0.0.0.0:8000/app/aidoc/download_pdf2layer/?folder_id=${folderId}`, { method: 'GET' });

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

            // Simulate API call
            await new Promise((resolve) => setTimeout(resolve, 1000 + Math.random() * 800));

            const success = Math.random() > 0.1; // Simulate some failures

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

    // This function is no longer strictly needed for `allFiles` state,
    // but kept for `renderFileTree` if it needs full paths.
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
            <div key={index} style={{marginLeft: `${level * 20}px`}}>
                <div className="flex items-center gap-2 py-1 text-sm text-gray-700">
                    {node.type === 'folder' ? (
                        <>
                            <FolderOpen className="w-4 h-4 text-blue-500"/>
                            <span className="font-medium">{node.name}</span>
                        </>
                    ) : (
                        <>
                            <div className="w-4 h-4 flex items-center justify-center">
                                <div className="w-1 h-1 bg-gray-400 rounded-full"/>
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
        setAllFiles([]); // Clear all files on reset
        setLogs([]);
        setStep2Logs([]);
    };

    const processedCountStep1 = logs.filter((log) => log.status === 'success' || log.status === 'error').length;
    const inProgressCountStep1 = logs.filter((log) => log.status === 'processing').length;
    const progressPercentStep1 = allFiles.length ? (processedCountStep1 / allFiles.length) * 100 : 0;


    return (
        <div className="p-8">
            <input
                type="file"
                ref={inputRef}
                style={{display: 'none'}}
                webkitdirectory="true"
                directory="true"
                onChange={handleFilesChange}
            />

            <div className="mb-8">
                <h2 className="text-3xl font-bold text-gray-800 mb-2">Chức năng chạy PDF 2 lớp</h2>
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
                        {currentStep === 1 ? '1' : <CheckCircle className="w-5 h-5"/>}
                    </div>
                    <span className="font-medium text-gray-700">Extract Layers</span>
                </div>
                <ArrowRight className="w-5 h-5 text-gray-400"/>
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
                            <FolderOpen className="w-5 h-5"/>
                            Select Folder
                        </button>

                        {selectedFolder && (
                            <>
                                <div className="mb-4 p-3 bg-gray-50 rounded-lg">
                                    <p className="text-sm text-gray-600 mb-1">Selected folder:</p>
                                    <p className="text-sm font-medium text-gray-800">{selectedFolder}</p>
                                </div>

                                {/* Card tiến trình */}
                                <div className="mb-4 p-4 bg-gray-50 rounded-lg border border-gray-200">
                                    <p className="text-sm text-gray-700 mb-1">
                                        Đã xử lý: {processedCountStep1} / {allFiles.length} | Đang xử
                                        lý: {inProgressCountStep1}
                                    </p>
                                    <div className="w-full h-3 bg-gray-200 rounded-full">
                                        <div
                                            className="h-3 bg-green-500 rounded-full transition-all duration-300"
                                            style={{width: `${progressPercentStep1}%`}}
                                        ></div>
                                    </div>
                                </div>

                                <div className="mb-6 p-4 bg-gray-50 rounded-lg max-h-64 overflow-y-auto">
                                    <p className="text-sm font-medium text-gray-700 mb-3">Directory Tree:</p>
                                    {renderFileTree(fileTree)}
                                </div>

                                <button
                                    onClick={handleStartStep1}
                                    disabled={isProcessing || allFiles.length === 0} // Disable if no files
                                    className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:bg-gray-300 disabled:cursor-not-allowed"
                                >
                                    {isProcessing ? (
                                        <>
                                            <Loader2 className="w-5 h-5 animate-spin"/>
                                            Processing...
                                        </>
                                    ) : (
                                        <>
                                            <Play className="w-5 h-5"/>
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
                                            <Loader2
                                                className="w-4 h-4 text-blue-500 animate-spin flex-shrink-0 mt-0.5"/>
                                        )}
                                        {log.status === 'success' && (
                                            <CheckCircle className="w-4 h-4 text-green-500 flex-shrink-0 mt-0.5"/>
                                        )}
                                        {log.status === 'error' && (
                                            <XCircle className="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5"/>
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
                            disabled={isDownloading || logs.filter((log) => log.status === 'success').length === 0} // Disable if no successful files
                            className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:bg-gray-300 disabled:cursor-not-allowed"
                        >
                            {isDownloading ? (
                                <>
                                    <Loader2 className="w-5 h-5 animate-spin"/>
                                    Generating...
                                </>
                            ) : (
                                <>
                                    <Download className="w-5 h-5"/>
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
                                            <Loader2
                                                className="w-4 h-4 text-blue-500 animate-spin flex-shrink-0 mt-0.5"/>
                                        )}
                                        {log.status === 'success' && (
                                            <CheckCircle className="w-4 h-4 text-green-500 flex-shrink-0 mt-0.5"/>
                                        )}
                                        {log.status === 'error' && (
                                            <XCircle className="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5"/>
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