import React from 'react';
import { ScrollArea } from './ui/scroll-area';

export function AboutView() {
  return (
    <ScrollArea className="h-[300px] pr-4">
      <div className="space-y-4 text-sm text-muted-foreground">
        <p>
          <strong className="text-foreground">Token Link</strong> helps you keep Figma and your design tokens in sync.
        </p>
        <p>
          It reads variables from selected elements and components, matches them to your design tokens, and smartly applies the right variables back into Figma — so components become tokenized without manual plumbing.
        </p>
        <p>
          It is based on the original <span className="text-blue-400 cursor-pointer hover:underline">cursor-talk-to-figma-mcp</span> project and has been customized for token-driven workflows, reverse tokenization, and tighter integration with our design system.
        </p>
      </div>
    </ScrollArea>
  );
}
