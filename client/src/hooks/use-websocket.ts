import { useEffect, useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";

interface WebSocketMessage {
  type: string;
  data: any;
}

interface UseWebSocketOptions {
  onWhatsAppMessage?: (data: any) => void;
}

export function useWebSocket(options?: UseWebSocketOptions) {
  const [isConnected, setIsConnected] = useState(false);
  const wsRef = useRef<WebSocket | null>(null);
  const queryClient = useQueryClient();
  const optionsRef = useRef(options);

  // Keep options ref updated
  useEffect(() => {
    optionsRef.current = options;
  }, [options]);

  useEffect(() => {
    const token = localStorage.getItem("auth_token");
    if (!token) {
      console.log("No token available for WebSocket connection");
      return;
    }

    // Use window.location.host which includes port (e.g., "localhost:5000")
    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    const host = window.location.host;
    const wsUrl = `${protocol}//${host}/ws?token=${encodeURIComponent(token)}`;
    
    console.log("Connecting to WebSocket:", wsUrl.replace(token, "[TOKEN]"));
    const ws = new WebSocket(wsUrl);

    ws.onopen = () => {
      console.log("WebSocket connected");
      setIsConnected(true);
    };

    ws.onmessage = (event) => {
      try {
        const message: WebSocketMessage = JSON.parse(event.data);
        
        // Handle different message types
        switch (message.type) {
          case "ia_created":
          case "ia_updated":
            queryClient.invalidateQueries({ queryKey: ["/api/ias"] });
            break;
          case "ticket_created":
          case "ticket_updated":
            queryClient.invalidateQueries({ queryKey: ["/api/tickets"] });
            break;
          case "message_created":
            queryClient.invalidateQueries({ queryKey: ["/api/messages"] });
            break;
          case "whatsapp_message_received":
            // Invalidar todas as queries de WhatsApp para garantir atualização
            queryClient.invalidateQueries({ 
              queryKey: ["/api/whatsapp/instances"]
            });
            console.log("📱 WhatsApp message received - invalidating queries");
            
            // Call callback if provided (using ref to avoid dependency issues)
            if (optionsRef.current?.onWhatsAppMessage) {
              optionsRef.current.onWhatsAppMessage(message.data);
            }
            break;
        }
      } catch (error) {
        console.error("Error parsing WebSocket message:", error);
      }
    };

    ws.onclose = () => {
      console.log("WebSocket disconnected");
      setIsConnected(false);
    };

    ws.onerror = (error) => {
      console.error("WebSocket error:", error);
    };

    wsRef.current = ws;

    return () => {
      ws.close();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [queryClient]);

  return { isConnected };
}
