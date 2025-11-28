import React from 'react';
import { motion } from 'motion/react';
import { Zap, ZapOff } from 'lucide-react';
import { cn } from './ui/utils';

interface ConnectionStatusProps {
  isConnected: boolean;
  port: number;
  channel: string;
}

export function ConnectionStatus({ isConnected, port, channel }: ConnectionStatusProps) {
  return (
    <div className="flex flex-col items-center justify-center py-8 space-y-6">
      <div className="relative flex items-center justify-center">
        {/* Pulsing Background Rings */}
        {isConnected && (
          <>
            <motion.div
              initial={{ scale: 0.8, opacity: 0.5 }}
              animate={{ scale: 1.5, opacity: 0 }}
              transition={{ duration: 2, repeat: Infinity, ease: "easeOut" }}
              className="absolute w-24 h-24 rounded-full bg-green-500/20"
            />
            <motion.div
              initial={{ scale: 0.8, opacity: 0.5 }}
              animate={{ scale: 1.2, opacity: 0 }}
              transition={{ duration: 2, repeat: Infinity, ease: "easeOut", delay: 0.5 }}
              className="absolute w-24 h-24 rounded-full bg-green-500/20"
            />
          </>
        )}

        {/* Main Status Icon Circle */}
        <motion.div
          animate={{
            backgroundColor: isConnected ? 'rgba(34, 197, 94, 0.1)' : 'rgba(239, 68, 68, 0.1)',
            borderColor: isConnected ? 'rgba(34, 197, 94, 0.5)' : 'rgba(239, 68, 68, 0.5)',
          }}
          className={cn(
            "w-24 h-24 rounded-full flex items-center justify-center border-2 backdrop-blur-sm transition-colors duration-500"
          )}
        >
          {isConnected ? (
            <Zap className="w-10 h-10 text-green-500 fill-current" />
          ) : (
            <ZapOff className="w-10 h-10 text-red-500" />
          )}
        </motion.div>
      </div>

      <div className="text-center space-y-2">
        <h3 className={cn(
          "text-lg font-semibold transition-colors duration-300",
          isConnected ? "text-green-500" : "text-foreground"
        )}>
          {isConnected ? 'Connected' : 'Disconnected'}
        </h3>
        
        {isConnected ? (
          <div className="flex flex-col gap-1 text-sm text-muted-foreground">
            <span>Port: <span className="font-mono text-foreground">{port}</span></span>
            <span>Channel: <span className="font-mono text-foreground">{channel}</span></span>
          </div>
        ) : (
          <p className="text-sm text-muted-foreground max-w-[200px] mx-auto">
            Connect to the local server to sync your design tokens.
          </p>
        )}
      </div>
    </div>
  );
}
