import { useEffect, useRef, useState, useCallback } from "react";
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
  const pendingMessagesRef = useRef<any[]>([]);
  const activeInstancesRef = useRef<Set<string>>(new Set());

  // Keep options ref updated
  useEffect(() => {
    optionsRef.current = options;
  }, [options]);

  // Method to send messages to WebSocket
  const sendMessage = useCallback((message: any) => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(message));
    } else {
      // Queue message if WebSocket is not open yet
      pendingMessagesRef.current.push(message);
    }
  }, []);

  // Methods to register/unregister instance monitoring
  const registerInstance = useCallback((instanceId: string) => {
    activeInstancesRef.current.add(instanceId);
    sendMessage({ type: "register_instance", instanceId });
  }, [sendMessage]);

  const unregisterInstance = useCallback((instanceId: string) => {
    activeInstancesRef.current.delete(instanceId);
    sendMessage({ type: "unregister_instance", instanceId });
  }, [sendMessage]);

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
      
      // Send all pending messages
      while (pendingMessagesRef.current.length > 0) {
        const message = pendingMessagesRef.current.shift();
        ws.send(JSON.stringify(message));
      }
      
      // Re-register all active instances (in case of reconnect)
      activeInstancesRef.current.forEach((instanceId) => {
        console.log(`📱 Re-registering instance after reconnect: ${instanceId}`);
        ws.send(JSON.stringify({ type: "register_instance", instanceId }));
      });
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
            // Invalidar queries de WhatsApp de forma mais específica
            // 1. Invalidar lista de instâncias (caso status mude)
            queryClient.invalidateQueries({ 
              queryKey: ["/api/whatsapp/instances"]
            });
            
            // 2. Invalidar TODOS os chats (para atualizar contadores de não lidas)
            queryClient.invalidateQueries({ 
              predicate: (query) => {
                const key = query.queryKey;
                return Array.isArray(key) && 
                       key[0] === "/api/whatsapp/instances" && 
                       key[2] === "chats";
              }
            });
            
            // 3. Invalidar TODAS as mensagens (para atualizar mensagens em chats abertos)
            queryClient.invalidateQueries({ 
              predicate: (query) => {
                const key = query.queryKey;
                return Array.isArray(key) && 
                       key[0] === "/api/whatsapp/instances" && 
                       key[2] === "chats" &&
                       key[4] === "messages";
              }
            });
            
            console.log("📱 WhatsApp message received - invalidating all chats and messages queries");
            
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

  return { 
    isConnected, 
    registerInstance, 
    unregisterInstance 
  };
}
