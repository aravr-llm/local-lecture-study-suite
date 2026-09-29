import React from 'react';
import { ShieldCheck, Cpu, HardDriveDownload, Lock } from 'lucide-react';

interface PrivacyBannerProps {
  activeModel?: string;
}

export const PrivacyBanner: React.FC<PrivacyBannerProps> = ({ activeModel }) => {
  return (
    <div className="bg-slate-900 border-b border-slate-800 text-xs text-slate-300 py-1.5 px-4 flex flex-wrap items-center justify-between gap-3 shadow-inner">
      <div className="flex items-center space-x-4">
        <span className="flex items-center font-medium text-emerald-400">
          <ShieldCheck className="w-3.5 h-3.5 mr-1 text-emerald-400" />
          Privacy Mode: 100% Offline
        </span>
        <span className="flex items-center text-slate-400">
          <Cpu className="w-3.5 h-3.5 mr-1 text-indigo-400" />
          AI Processing: <span className="font-semibold text-slate-200 ml-1">LOCAL</span>
          {activeModel && <span className="text-slate-500 ml-1">({activeModel})</span>}
        </span>
        <span className="flex items-center text-slate-400">
          <Lock className="w-3.5 h-3.5 mr-1 text-amber-400" />
          External AI Services: <span className="font-semibold text-emerald-400 ml-1">NONE</span>
        </span>
      </div>

      <div className="flex items-center space-x-4">
        <span className="flex items-center text-slate-400">
          <HardDriveDownload className="w-3.5 h-3.5 mr-1 text-sky-400" />
          Transcription: <span className="font-semibold text-slate-200 ml-1">LOCAL</span>
        </span>
        <span className="bg-emerald-950/80 text-emerald-300 border border-emerald-800/60 px-2 py-0.5 rounded-full text-[10px] font-semibold tracking-wide">
          Audio Upload: DISABLED
        </span>
      </div>
    </div>
  );
};
