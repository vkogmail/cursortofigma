import React from 'react';

export function TokenLinkHeader() {
  return (
    <div className="flex items-center gap-3 mb-6">
      {/* Logo matching the screenshot */}
      <div className="w-10 h-10 bg-[#C7E02A] rounded-xl flex items-center justify-center shrink-0 shadow-lg shadow-[#C7E02A]/20">
        <div className="w-6 h-6 bg-black rounded-full flex items-center justify-center">
           <div className="w-0 h-0 border-t-[4px] border-t-transparent border-l-[7px] border-l-[#C7E02A] border-b-[4px] border-b-transparent ml-0.5"></div>
        </div>
      </div>
      <div>
        <h1 className="font-bold text-lg leading-tight tracking-tight">Token Link</h1>
        <p className="text-xs text-muted-foreground font-medium">Sync Variables & Tokens</p>
      </div>
    </div>
  );
}
