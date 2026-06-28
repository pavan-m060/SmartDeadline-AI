import React, { useState, useRef, ChangeEvent, DragEvent } from "react";
import { Attachment } from "../types";
import { Paperclip, Trash2, Upload, Eye, Download, RefreshCw, X, FileText, Image as ImageIcon, FileArchive, File, Presentation, AlertCircle } from "lucide-react";

interface AttachmentManagerProps {
  attachments: Attachment[];
  onChange: (attachments: Attachment[]) => void;
  title?: string;
}

export default function AttachmentManager({ 
  attachments = [], 
  onChange, 
  title = "Assignment Attachments" 
}: AttachmentManagerProps) {
  const [error, setError] = useState<string | null>(null);
  const [dragActive, setDragActive] = useState<boolean>(false);
  const [previewAttachment, setPreviewAttachment] = useState<Attachment | null>(null);
  const [replacingId, setReplacingId] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const replaceInputRef = useRef<HTMLInputElement>(null);

  // Determine file-specific icon and style color
  const getFileIconAndColor = (name: string, type: string) => {
    const ext = name.split(".").pop()?.toLowerCase() || "";
    const mime = type.toLowerCase();

    if (ext === "pdf" || mime.includes("pdf")) {
      return {
        icon: <FileText className="w-5 h-5 text-rose-400" />,
        bgColor: "bg-rose-500/10",
        borderColor: "border-rose-500/20",
        textColor: "text-rose-400"
      };
    }
    if (ext === "docx" || ext === "doc" || mime.includes("word") || mime.includes("msword")) {
      return {
        icon: <FileText className="w-5 h-5 text-blue-400" />,
        bgColor: "bg-blue-500/10",
        borderColor: "border-blue-500/20",
        textColor: "text-blue-400"
      };
    }
    if (ext === "ppt" || ext === "pptx" || mime.includes("presentation") || mime.includes("powerpoint")) {
      return {
        icon: <Presentation className="w-5 h-5 text-amber-400" />,
        bgColor: "bg-amber-500/10",
        borderColor: "border-amber-500/20",
        textColor: "text-amber-400"
      };
    }
    if (["png", "jpg", "jpeg", "gif", "webp", "svg"].includes(ext) || mime.startsWith("image/")) {
      return {
        icon: <ImageIcon className="w-5 h-5 text-emerald-400" />,
        bgColor: "bg-emerald-500/10",
        borderColor: "border-emerald-500/20",
        textColor: "text-emerald-400"
      };
    }
    if (ext === "zip" || mime.includes("zip") || mime.includes("compressed") || mime.includes("archive")) {
      return {
        icon: <FileArchive className="w-5 h-5 text-indigo-400" />,
        bgColor: "bg-indigo-500/10",
        borderColor: "border-indigo-500/20",
        textColor: "text-indigo-400"
      };
    }
    
    // Default
    return {
      icon: <File className="w-5 h-5 text-slate-400" />,
      bgColor: "bg-slate-500/10",
      borderColor: "border-slate-500/20",
      textColor: "text-slate-400"
    };
  };

  // Helper to format date
  const formatUploadDate = (dateStr?: string) => {
    if (!dateStr) return "N/A";
    try {
      const d = new Date(dateStr);
      return d.toLocaleDateString(undefined, {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch (e) {
      return dateStr;
    }
  };

  // Process selected files
  const processFiles = (files: FileList) => {
    const newAttachments: Attachment[] = [];
    let hasError = false;

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      // Limit to 2MB per file to avoid excessive local storage and payload sizing issues
      if (file.size > 2 * 1024 * 1024) {
        setError(`File "${file.name}" exceeds the 2MB upload limit.`);
        hasError = true;
        continue;
      }

      const reader = new FileReader();
      reader.onload = (event) => {
        if (event.target?.result) {
          const newAttachment: Attachment = {
            id: `attachment-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
            name: file.name,
            size: (file.size / 1024).toFixed(1) + " KB",
            type: file.type || "application/octet-stream",
            dataUrl: event.target.result as string,
            uploadDate: new Date().toISOString()
          };
          onChange([...attachments, ...newAttachments, newAttachment]);
        }
      };
      reader.readAsDataURL(file);
    }

    if (!hasError) {
      setError(null);
    }
  };

  // Drag handlers
  const handleDrag = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      processFiles(e.dataTransfer.files);
    }
  };

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      processFiles(e.target.files);
    }
  };

  // Replace file handler
  const handleReplaceClick = (id: string) => {
    setReplacingId(id);
    if (replaceInputRef.current) {
      replaceInputRef.current.click();
    }
  };

  const handleReplaceFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0] && replacingId) {
      const file = e.target.files[0];
      if (file.size > 2 * 1024 * 1024) {
        setError(`File "${file.name}" exceeds the 2MB upload limit.`);
        setReplacingId(null);
        return;
      }

      const reader = new FileReader();
      reader.onload = (event) => {
        if (event.target?.result) {
          const updatedAttachments = attachments.map((att) => {
            if (att.id === replacingId) {
              return {
                ...att,
                name: file.name,
                size: (file.size / 1024).toFixed(1) + " KB",
                type: file.type || "application/octet-stream",
                dataUrl: event.target.result as string,
                uploadDate: new Date().toISOString()
              };
            }
            return att;
          });
          onChange(updatedAttachments);
          setError(null);
          setReplacingId(null);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const handleRemoveAttachment = (id: string) => {
    onChange(attachments.filter(att => att.id !== id));
  };

  // Safe base64 text content decoder
  const getDecodedText = (dataUrl: string) => {
    try {
      const base64Content = dataUrl.split(",")[1];
      const decoded = atob(base64Content);
      return decoded;
    } catch (e) {
      return "Unable to decode text content.";
    }
  };

  // Is previewable check
  const isTextFile = (type: string, name: string) => {
    const mime = type.toLowerCase();
    const ext = name.split(".").pop()?.toLowerCase() || "";
    return mime.startsWith("text/") || ["txt", "md", "json", "js", "ts", "html", "css"].includes(ext);
  };

  const isImageFile = (type: string, name: string) => {
    const mime = type.toLowerCase();
    const ext = name.split(".").pop()?.toLowerCase() || "";
    return mime.startsWith("image/") || ["png", "jpg", "jpeg", "gif", "webp", "svg"].includes(ext);
  };

  return (
    <div className="space-y-4">
      {}
      <div className="flex items-center justify-between">
        <label className="text-xs font-mono font-semibold text-slate-400 uppercase tracking-wider block">
          {title} ({attachments.length})
        </label>
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          className="text-xs text-indigo-400 hover:text-indigo-300 font-semibold flex items-center gap-1.5 cursor-pointer bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-1.5 hover:bg-slate-850 transition"
        >
          <Upload className="w-3.5 h-3.5" />
          <span>Upload File</span>
        </button>
      </div>

      {}
      {error && (
        <div className="p-3 bg-rose-500/10 border border-rose-500/20 rounded-lg text-rose-400 text-xs font-mono flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {}
      <input
        type="file"
        ref={fileInputRef}
        multiple
        onChange={handleFileChange}
        className="hidden"
        accept=".pdf,.docx,.doc,.ppt,.pptx,.png,.jpg,.jpeg,.gif,.zip,.rar,.txt,.csv,.json"
      />
      
      <input
        type="file"
        ref={replaceInputRef}
        onChange={handleReplaceFileChange}
        className="hidden"
        accept=".pdf,.docx,.doc,.ppt,.pptx,.png,.jpg,.jpeg,.gif,.zip,.rar,.txt,.csv,.json"
      />

      {}
      {attachments.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {attachments.map((att) => {
            const style = getFileIconAndColor(att.name, att.type);
            return (
              <div 
                key={att.id} 
                className="flex items-center justify-between p-3 bg-slate-950/60 hover:bg-slate-950 border border-slate-850 hover:border-slate-800 rounded-xl transition duration-200 group"
              >
                <div className="flex items-center gap-3 truncate max-w-[70%]">
                  <div className={`p-2 rounded-lg ${style.bgColor} border ${style.borderColor} shrink-0`}>
                    {style.icon}
                  </div>
                  <div className="truncate">
                    <p className="font-medium text-xs text-slate-200 truncate" title={att.name}>
                      {att.name}
                    </p>
                    <div className="flex items-center gap-2 text-[10px] text-slate-500 font-mono mt-0.5">
                      <span className="font-semibold text-slate-400">{att.size}</span>
                      <span>•</span>
                      <span className="truncate">{formatUploadDate(att.uploadDate)}</span>
                    </div>
                  </div>
                </div>

                {}
                <div className="flex items-center gap-1.5 shrink-0 opacity-85 group-hover:opacity-100 transition">
                  {}
                  <button
                    type="button"
                    onClick={() => setPreviewAttachment(att)}
                    className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-900 border border-transparent hover:border-slate-800 transition cursor-pointer"
                    title="Preview Attachment"
                  >
                    <Eye className="w-3.5 h-3.5" />
                  </button>

                  {}
                  <a
                    href={att.dataUrl}
                    download={att.name}
                    className="p-1.5 rounded-lg text-slate-400 hover:text-indigo-400 hover:bg-slate-900 border border-transparent hover:border-slate-800 transition flex items-center justify-center cursor-pointer"
                    title="Download Attachment"
                  >
                    <Download className="w-3.5 h-3.5" />
                  </a>

                  {}
                  <button
                    type="button"
                    onClick={() => handleReplaceClick(att.id)}
                    className="p-1.5 rounded-lg text-slate-400 hover:text-amber-400 hover:bg-slate-900 border border-transparent hover:border-slate-800 transition cursor-pointer"
                    title="Replace Attachment"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                  </button>

                  {}
                  <button
                    type="button"
                    onClick={() => handleRemoveAttachment(att.id)}
                    className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-slate-900 border border-transparent hover:border-slate-800 transition cursor-pointer"
                    title="Delete Attachment"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        
        <div 
          onDragEnter={handleDrag}
          onDragOver={handleDrag}
          onDragLeave={handleDrag}
          onDrop={handleDrop}
          className={`border border-dashed rounded-xl p-8 transition duration-200 text-center relative ${
            dragActive 
              ? "border-indigo-500 bg-indigo-500/5 text-indigo-400" 
              : "border-slate-800 bg-slate-950/20 text-slate-500 hover:border-slate-700/60"
          }`}
        >
          <div className="flex flex-col items-center justify-center gap-2 max-w-sm mx-auto pointer-events-none">
            <div className="p-3 bg-slate-900/40 border border-slate-850 rounded-2xl text-slate-400">
              <Paperclip className="w-6 h-6 text-indigo-400" />
            </div>
            <p className="text-xs font-semibold text-slate-300">
              Drag & drop files to attach
            </p>
            <p className="text-[10px] text-slate-500 font-mono leading-relaxed mt-0.5">
              Supports PDFs, Word documents, PowerPoint slides, Images, and ZIP archives up to 2MB.
            </p>
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="mt-3 text-xs font-semibold px-4 py-1.5 rounded-xl border border-slate-800 bg-slate-950/80 text-indigo-400 hover:text-indigo-300 hover:bg-slate-900 transition pointer-events-auto cursor-pointer"
            >
              Select Files
            </button>
          </div>
        </div>
      )}

      {}
      {previewAttachment && (
        <div className="fixed inset-0 bg-black/85 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 w-full max-w-4xl max-h-[85vh] rounded-2xl overflow-hidden flex flex-col shadow-2xl">
            {}
            <div className="p-4 border-b border-slate-800 flex items-center justify-between bg-slate-950/50">
              <div className="flex items-center gap-2.5 truncate max-w-[70%]">
                <Paperclip className="w-4 h-4 text-indigo-400 shrink-0" />
                <span className="font-semibold text-sm text-slate-200 truncate" title={previewAttachment.name}>
                  {previewAttachment.name}
                </span>
                <span className="text-[10px] font-mono text-slate-500 shrink-0">({previewAttachment.size})</span>
              </div>
              <div className="flex items-center gap-2">
                <a
                  href={previewAttachment.dataUrl}
                  download={previewAttachment.name}
                  className="px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-xs font-bold text-white flex items-center gap-1.5 transition"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Download</span>
                </a>
                <button
                  onClick={() => setPreviewAttachment(null)}
                  className="p-1.5 rounded-lg hover:bg-slate-800 border border-slate-800 text-slate-400 hover:text-white transition"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {}
            <div className="flex-1 overflow-auto bg-slate-950 p-6 flex items-center justify-center min-h-[300px]">
              {isImageFile(previewAttachment.type, previewAttachment.name) ? (
                
                <img 
                  src={previewAttachment.dataUrl} 
                  alt={previewAttachment.name} 
                  className="max-w-full max-h-[60vh] object-contain rounded shadow"
                />
              ) : isTextFile(previewAttachment.type, previewAttachment.name) ? (
                
                <div className="w-full h-full max-h-[60vh] text-left">
                  <pre className="p-4 bg-slate-900 border border-slate-850 text-slate-300 font-mono text-xs rounded-xl overflow-auto whitespace-pre-wrap select-text h-full max-h-[55vh]">
                    {getDecodedText(previewAttachment.dataUrl)}
                  </pre>
                </div>
              ) : previewAttachment.type.toLowerCase() === "application/pdf" || previewAttachment.name.toLowerCase().endsWith(".pdf") ? (
                
                <div className="w-full h-full max-h-[60vh] flex flex-col items-center justify-center">
                  <object 
                    data={previewAttachment.dataUrl} 
                    type="application/pdf" 
                    className="w-full h-[55vh] rounded-xl border border-slate-800"
                  >
                    <div className="text-center space-y-3.5 py-12 max-w-md">
                      <div className="w-16 h-16 bg-rose-500/10 border border-rose-500/20 text-rose-400 rounded-2xl flex items-center justify-center mx-auto">
                        <FileText className="w-8 h-8" />
                      </div>
                      <p className="font-semibold text-slate-200">PDF Document View</p>
                      <p className="text-xs text-slate-400">
                        Your browser doesn't support rendering PDF files inline, or sandboxed permissions prevent embedding. You can download the PDF to view it on your machine.
                      </p>
                      <a
                        href={previewAttachment.dataUrl}
                        download={previewAttachment.name}
                        className="inline-flex items-center gap-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 font-semibold text-xs text-white rounded-xl transition shadow"
                      >
                        <Download className="w-4 h-4" />
                        <span>Download & Open PDF</span>
                      </a>
                    </div>
                  </object>
                </div>
              ) : (
                
                <div className="text-center space-y-4 max-w-md py-8">
                  <div className="p-4 bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 rounded-2xl w-16 h-16 flex items-center justify-center mx-auto">
                    <File className="w-8 h-8" />
                  </div>
                  <div>
                    <p className="font-semibold text-slate-200 text-sm">
                      Preview Unavailable for this file type
                    </p>
                    <p className="text-xs text-slate-400 mt-1 font-mono">
                      Type: {previewAttachment.type || "Unknown File Type"}
                    </p>
                    <p className="text-[11px] text-slate-500 mt-2">
                      Documents like Microsoft Word (.docx), PowerPoint (.pptx), or compressed archives (.zip) cannot be rendered natively inside the browser preview. Please download the file to view its full content.
                    </p>
                  </div>
                  <div className="pt-2">
                    <a
                      href={previewAttachment.dataUrl}
                      download={previewAttachment.name}
                      className="inline-flex items-center gap-1.5 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 font-bold text-xs text-white rounded-xl transition shadow"
                    >
                      <Download className="w-4 h-4" />
                      <span>Download File</span>
                    </a>
                  </div>
                </div>
              )}
            </div>

            {}
            <div className="p-4 border-t border-slate-800 bg-slate-950/30 text-[11px] text-slate-500 font-mono text-center">
              Uploaded on: {formatUploadDate(previewAttachment.uploadDate)}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
