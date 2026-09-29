import React from 'react';
import { Download, FileText, Code2, Printer, X } from 'lucide-react';

interface ExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  lectureId: string;
  lectureTitle: string;
}

export const ExportModal: React.FC<ExportModalProps> = ({ isOpen, onClose, lectureId, lectureTitle }) => {
  if (!isOpen) return null;

  const handleDownload = (format: 'markdown' | 'json' | 'text') => {
    window.open(`/api/study/lectures/${lectureId}/export?format=${format}`, '_blank');
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
      <div className="bg-slate-900 border border-slate-700 rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-6 text-slate-200">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center space-x-2.5">
            <Download className="w-5 h-5 text-emerald-400" />
            <h3 className="font-bold text-white text-base">Export Study Materials</h3>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white p-1">
            <X className="w-4 h-4" />
          </button>
        </div>

        <p className="text-xs text-slate-400">
          Choose a format to export notes, flashcards, and transcripts for <span className="text-white font-medium">"{lectureTitle}"</span>.
        </p>

        <div className="space-y-3">
          <button
            onClick={() => handleDownload('markdown')}
            className="w-full bg-slate-950 hover:bg-slate-800/80 border border-slate-800 hover:border-slate-700 p-4 rounded-2xl flex items-center justify-between text-left transition group"
          >
            <div className="flex items-center space-x-3">
              <div className="w-9 h-9 rounded-xl bg-sky-500/10 text-sky-400 flex items-center justify-center group-hover:bg-sky-500/20">
                <FileText className="w-4 h-4" />
              </div>
              <div>
                <div className="font-semibold text-xs text-white">Markdown (.md)</div>
                <div className="text-[11px] text-slate-400">Formatted with headings, quotes, and flashcard deck</div>
              </div>
            </div>
            <Download className="w-4 h-4 text-slate-500 group-hover:text-white transition" />
          </button>

          <button
            onClick={() => handleDownload('json')}
            className="w-full bg-slate-950 hover:bg-slate-800/80 border border-slate-800 hover:border-slate-700 p-4 rounded-2xl flex items-center justify-between text-left transition group"
          >
            <div className="flex items-center space-x-3">
              <div className="w-9 h-9 rounded-xl bg-purple-500/10 text-purple-400 flex items-center justify-center group-hover:bg-purple-500/20">
                <Code2 className="w-4 h-4" />
              </div>
              <div>
                <div className="font-semibold text-xs text-white">JSON Archive (.json)</div>
                <div className="text-[11px] text-slate-400">Complete raw structured data bundle with timestamps</div>
              </div>
            </div>
            <Download className="w-4 h-4 text-slate-500 group-hover:text-white transition" />
          </button>

          <button
            onClick={() => handleDownload('text')}
            className="w-full bg-slate-950 hover:bg-slate-800/80 border border-slate-800 hover:border-slate-700 p-4 rounded-2xl flex items-center justify-between text-left transition group"
          >
            <div className="flex items-center space-x-3">
              <div className="w-9 h-9 rounded-xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center group-hover:bg-emerald-500/20">
                <FileText className="w-4 h-4" />
              </div>
              <div>
                <div className="font-semibold text-xs text-white">Plain Text (.txt)</div>
                <div className="text-[11px] text-slate-400">Clean unformatted text for simple reading on any device</div>
              </div>
            </div>
            <Download className="w-4 h-4 text-slate-500 group-hover:text-white transition" />
          </button>

          <button
            onClick={handlePrint}
            className="w-full bg-slate-950 hover:bg-slate-800/80 border border-slate-800 hover:border-slate-700 p-4 rounded-2xl flex items-center justify-between text-left transition group"
          >
            <div className="flex items-center space-x-3">
              <div className="w-9 h-9 rounded-xl bg-amber-500/10 text-amber-400 flex items-center justify-center group-hover:bg-amber-500/20">
                <Printer className="w-4 h-4" />
              </div>
              <div>
                <div className="font-semibold text-xs text-white">Print / Save as PDF</div>
                <div className="text-[11px] text-slate-400">Standard print-ready dialog</div>
              </div>
            </div>
            <Printer className="w-4 h-4 text-slate-500 group-hover:text-white transition" />
          </button>
        </div>
      </div>
    </div>
  );
};
