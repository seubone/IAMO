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
      console.log("⚠️ No token available for WebSocket connection");
      return;
    }

    // Validate token format (basic check - should be JWT format)
    if (!token.includes(".")) {
      console.warn("⚠️ Invalid token format detected - clearing authentication");
      localStorage.removeItem("auth_token");
      return;
    }

    // Use window.location.host which includes port (e.g., "localhost:5000")
    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    const host = window.location.host;
    // Build WebSocket URL - ensure token is properly encoded
    const encodedToken = encodeURIComponent(token);
    const wsUrl = `${protocol}//${host}/ws?token=${encodedToken}`;

    console.log("🔌 Connecting to WebSocket...", wsUrl.replace(token, "[TOKEN]"));
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
        
        // Handle different message types com error handling aprimorado
        try {
          switch (message.type) {
            case "ia_created":
            case "ia_updated":
              // Invalidação granular: apenas a lista de IAs, não rotas aninhadas
              queryClient.invalidateQueries({ 
                queryKey: ["/api/ias"],
                exact: true 
              });
              break;
            case "ticket_created":
            case "ticket_updated":
              // Invalidação granular: apenas a lista de tickets
              queryClient.invalidateQueries({ 
                queryKey: ["/api/tickets"],
                exact: true 
              });
              break;
            case "message_created":
              // Invalidação granular: apenas mensagens relacionadas
              queryClient.invalidateQueries({ 
                predicate: (query) => {
                  const key = query.queryKey;
                  return Array.isArray(key) && key[0] === "/api/messages";
                }
              });
              break;
            case "whatsapp_message_received":
              // CRITICAL FIX: Properly invalidate both messages AND chat list
              // Data structure: { instanceId, remoteJid, messageId, ... }
              const { instanceId, remoteJid } = message.data || {};

              if (instanceId && remoteJid) {
                // 1. Invalidate this chat's messages (most specific)
                queryClient.invalidateQueries({
                  queryKey: [
                    `/api/whatsapp/instances/${instanceId}/chats/${remoteJid}/messages`
                  ],
                  exact: false  // Also invalidates pagination variants
                });

                console.log(`📱 ✅ Message received - invalidating messages for: ${remoteJid}`);

                // 2. CRITICAL: Also invalidate the entire chat list
                // This updates last message, unread count, and order
                queryClient.invalidateQueries({
                  queryKey: [`/api/whatsapp/instances/${instanceId}/chats`],
                  exact: true  // Exact match only - don't invalidate sub-queries
                });

                console.log(`📱 ✅ Invalidating chat list for instance: ${instanceId}`);
              } else {
                // Fallback: if data doesn't have instanceId/remoteJid, invalidate all messages
                console.warn("⚠️ WhatsApp message missing instanceId/remoteJid");

                queryClient.invalidateQueries({
                  predicate: (query) => {
                    const key = query.queryKey;
                    return Array.isArray(key) &&
                           key[0] === "/api/whatsapp/instances" &&
                           key[4] === "messages";
                  }
                });

                // Also invalidate all chat lists
                queryClient.invalidateQueries({
                  predicate: (query) => {
                    const key = query.queryKey;
                    return Array.isArray(key) &&
                           key[0] === "/api/whatsapp/instances" &&
                           key[2] === "chats";
                  }
                });
              }

              // Call callback if provided (using ref to avoid dependency issues)
              if (optionsRef.current?.onWhatsAppMessage) {
                try {
                  optionsRef.current.onWhatsAppMessage(message.data);
                } catch (callbackError) {
                  console.error("Error in onWhatsAppMessage callback:", callbackError);
                }
              }
              break;

            case "message_status_updated":
              // Handle message status updates (pending -> sent -> delivered -> read)
              console.log(`📨 Message status updated:`, message.data);

              // Update cache directly instead of invalidating (faster, no refetch)
              // This updates the status without causing a delay
              queryClient.setQueriesData(
                {
                  predicate: (query) => {
                    const key = query.queryKey;
                    return Array.isArray(key) &&
                           key[0] === "/api/whatsapp/instances" &&
                           key[4] === "messages";
                  }
                },
                (oldData: any) => {
                  if (!Array.isArray(oldData)) return oldData;

                  // Update message with new status
                  // Match by messageId, optimistic ID, or message's key.id
                  return oldData.map((msg: any) => {
                    const messageIdMatches =
                      msg.id === message.data.messageId ||
                      msg.key?.id === message.data.messageId ||
                      msg.id === message.data.optimisticId ||
                      msg.key?.id === message.data.optimisticId;

                    if (messageIdMatches) {
                      console.log(`✅ Message status updated: ${msg.id} -> ${message.data.status}`);
                      return { ...msg, status: message.data.status };
                    }
                    return msg;
                  });
                }
              );
              break;

            case "instances_changed":
              // Handle instance count changes - invalidate instances list to trigger refresh
              console.log(`🔄 Instance count changed to: ${message.data.count}`);
              queryClient.invalidateQueries({
                queryKey: ["/api/whatsapp/instances"],
                exact: true
              });
              break;
          }
        } catch (handlerError) {
          console.error("Error handling WebSocket message type:", message.type, handlerError);
        }
      } catch (parseError) {
        console.error("Error parsing WebSocket message:", parseError);
      }
    };

    ws.onclose = (event) => {
      console.log("🔌 WebSocket disconnected", { code: event.code, reason: event.reason });
      setIsConnected(false);

      // Code 1008 = Policy Violation (usually authentication error)
      if (event.code === 1008) {
        console.warn("❌ WebSocket rejected due to authentication error. Token may be invalid or expired.");
        localStorage.removeItem("auth_token");
      }
    };

    ws.onerror = (error) => {
      console.error("❌ WebSocket error:", error);
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
