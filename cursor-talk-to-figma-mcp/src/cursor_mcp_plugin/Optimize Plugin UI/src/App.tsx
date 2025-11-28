import React, { useState, useEffect } from 'react';
import { TokenLinkHeader } from './components/TokenLinkHeader';
import { ConnectionStatus } from './components/ConnectionStatus';
import { AboutView } from './components/AboutView';
import { Button } from './components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './components/ui/tabs';
import { Card, CardContent } from './components/ui/card';
import { Toaster } from './components/ui/sonner';
import { toast } from 'sonner@2.0.3';
import { Link2, Info, Power } from 'lucide-react';

export default function App() {
  // Simulate connection state
  const [isConnected, setIsConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);

  const handleConnect = () => {
    setIsConnecting(true);
    // Simulate network delay
    setTimeout(() => {
      setIsConnecting(false);
      setIsConnected(true);
      toast.success("Connected to server", {
        description: "Listening on port 3055"
      });
    }, 1500);
  };

  const handleDisconnect = () => {
    setIsConnected(false);
    toast.info("Disconnected", {
        description: "Connection closed"
    });
  };

  return (
    <div className="dark min-h-screen bg-neutral-950 text-neutral-50 font-sans selection:bg-[#C7E02A] selection:text-black flex items-center justify-center p-4">
      <Card className="w-full max-w-[380px] bg-neutral-900 border-neutral-800 shadow-2xl overflow-hidden relative">
        {/* Decorative background glow */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-32 h-32 bg-[#C7E02A] blur-[100px] opacity-10 pointer-events-none" />

        <CardContent className="p-6 relative z-10">
          <TokenLinkHeader />

          <Tabs defaultValue="connection" className="w-full">
            <TabsList className="grid w-full grid-cols-2 mb-6 bg-neutral-950/50">
              <TabsTrigger value="connection" className="data-[state=active]:bg-neutral-800 data-[state=active]:text-[#C7E02A]">
                <Link2 className="w-4 h-4 mr-2" />
                Connection
              </TabsTrigger>
              <TabsTrigger value="about" className="data-[state=active]:bg-neutral-800 data-[state=active]:text-[#C7E02A]">
                <Info className="w-4 h-4 mr-2" />
                About
              </TabsTrigger>
            </TabsList>

            <TabsContent value="connection" className="mt-0">
              <div className="flex flex-col gap-4">
                <div className="bg-neutral-950/50 rounded-xl border border-neutral-800 p-4">
                  <ConnectionStatus 
                    isConnected={isConnected}
                    port={3055}
                    channel="figma-mcp-default"
                  />
                </div>

                <Button 
                  size="lg"
                  className={`w-full font-semibold transition-all duration-300 ${
                    isConnected 
                      ? "bg-neutral-800 hover:bg-neutral-700 text-neutral-300 hover:text-white border-transparent" 
                      : "bg-[#C7E02A] hover:bg-[#b4cc25] text-black shadow-[#C7E02A]/20 shadow-lg"
                  }`}
                  onClick={isConnected ? handleDisconnect : handleConnect}
                  disabled={isConnecting}
                >
                  {isConnecting ? (
                    <span className="flex items-center gap-2">
                      <span className="animate-spin rounded-full h-4 w-4 border-b-2 border-black"></span>
                      Connecting...
                    </span>
                  ) : isConnected ? (
                    <span className="flex items-center gap-2">
                      <Power className="w-4 h-4" />
                      Disconnect
                    </span>
                  ) : (
                    "Connect Server"
                  )}
                </Button>
              </div>
            </TabsContent>

            <TabsContent value="about" className="mt-0">
              <div className="bg-neutral-950/50 rounded-xl border border-neutral-800 p-4 min-h-[300px]">
                <AboutView />
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
        
        {/* Status Footer Line */}
        <div className={`h-1 w-full transition-colors duration-500 ${isConnected ? 'bg-green-500' : 'bg-neutral-800'}`} />
      </Card>

      <Toaster theme="dark" position="bottom-center" />
    </div>
  );
}
