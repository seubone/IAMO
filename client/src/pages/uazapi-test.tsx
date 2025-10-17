import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { whatsappAPI } from "@/lib/api";
import { Loader2, Send, CheckCheck, Smile, Trash2, Pin, Archive, Eye, Phone } from "lucide-react";

export default function UazapiTest() {
  const { toast } = useToast();
  const [instanceNumber, setInstanceNumber] = useState("5584998973484");
  const [testNumber, setTestNumber] = useState("5584998973484");
  const [messageText, setMessageText] = useState("🧪 Teste de funcionalidade - UazAPI");
  const [messageId, setMessageId] = useState("");
  const [emojiText, setEmojiText] = useState("👍");

  // Send Message Mutation
  const sendMessageMutation = useMutation({
    mutationFn: (data: { instanceNumber: string; recipientNumber: string; text: string }) =>
      whatsappAPI.sendMessage(data),
    onSuccess: (response: any) => {
      toast({
        title: "✅ Mensagem enviada",
        description: `ID: ${response.data?.key?.id || "N/A"}`,
      });
      if (response.data?.key?.id) {
        setMessageId(response.data.key.id);
      }
    },
    onError: (error: any) => {
      toast({
        title: "❌ Erro ao enviar mensagem",
        description: error.message || "Erro desconhecido",
        variant: "destructive",
      });
    },
  });

  // React Mutation
  const reactMutation = useMutation({
    mutationFn: (data: { instanceNumber: string; number: string; text: string; id: string }) =>
      whatsappAPI.react(data),
    onSuccess: () => {
      toast({
        title: "✅ Reação enviada",
        description: "Emoji adicionado à mensagem",
      });
    },
    onError: (error: any) => {
      toast({
        title: "❌ Erro ao reagir",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Delete Mutation
  const deleteMutation = useMutation({
    mutationFn: (data: { instanceNumber: string; id: string }) =>
      whatsappAPI.delete(data),
    onSuccess: () => {
      toast({
        title: "✅ Mensagem deletada",
        description: "Mensagem removida para todos",
      });
    },
    onError: (error: any) => {
      toast({
        title: "❌ Erro ao deletar",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Presence Mutation
  const presenceMutation = useMutation({
    mutationFn: (data: { instanceNumber: string; number: string; presence: string; delay?: number }) =>
      whatsappAPI.presence(data),
    onSuccess: () => {
      toast({
        title: "✅ Presença atualizada",
        description: "Status de digitação enviado",
      });
    },
    onError: (error: any) => {
      toast({
        title: "❌ Erro ao atualizar presença",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Archive Chat Mutation
  const archiveMutation = useMutation({
    mutationFn: (data: { instanceNumber: string; number: string; archive: boolean }) =>
      whatsappAPI.archiveChat(data),
    onSuccess: (_, variables) => {
      toast({
        title: variables.archive ? "✅ Chat arquivado" : "✅ Chat desarquivado",
        description: "Ação executada com sucesso",
      });
    },
    onError: (error: any) => {
      toast({
        title: "❌ Erro ao arquivar",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Pin Chat Mutation
  const pinMutation = useMutation({
    mutationFn: (data: { instanceNumber: string; number: string; pin: boolean }) =>
      whatsappAPI.pinChat(data),
    onSuccess: (_, variables) => {
      toast({
        title: variables.pin ? "✅ Chat fixado" : "✅ Chat desfixado",
        description: "Ação executada com sucesso",
      });
    },
    onError: (error: any) => {
      toast({
        title: "❌ Erro ao fixar",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Mark Chat Read Mutation
  const readChatMutation = useMutation({
    mutationFn: (data: { instanceNumber: string; number: string; read: boolean }) =>
      whatsappAPI.readChat(data),
    onSuccess: (_, variables) => {
      toast({
        title: variables.read ? "✅ Chat marcado como lido" : "✅ Chat marcado como não lido",
        description: "Ação executada com sucesso",
      });
    },
    onError: (error: any) => {
      toast({
        title: "❌ Erro ao marcar chat",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Check Numbers Mutation
  const checkNumbersMutation = useMutation({
    mutationFn: (data: { instanceNumber: string; numbers: string[] }) =>
      whatsappAPI.checkNumbers(data),
    onSuccess: (response: any) => {
      toast({
        title: "✅ Números verificados",
        description: `Total: ${response.data?.length || 0} números`,
      });
      console.log("Resultado da verificação:", response);
    },
    onError: (error: any) => {
      toast({
        title: "❌ Erro ao verificar números",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Get Status Mutation
  const statusMutation = useMutation({
    mutationFn: (instanceNumber: string) => whatsappAPI.getStatus(instanceNumber),
    onSuccess: (response: any) => {
      toast({
        title: "✅ Status obtido",
        description: `Status: ${response.data?.state || "desconhecido"}`,
      });
      console.log("Status da instância:", response);
    },
    onError: (error: any) => {
      toast({
        title: "❌ Erro ao buscar status",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  return (
    <div className="container mx-auto p-6 max-w-7xl">
      <div className="mb-6">
        <h1 className="text-3xl font-bold">🧪 Testes UazAPI</h1>
        <p className="text-muted-foreground mt-2">
          Validação interna de funcionalidades - Número de teste: {testNumber}
        </p>
      </div>

      {/* Configuration */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Configuração</CardTitle>
          <CardDescription>Configure os números para os testes</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="instance">Número da Instância</Label>
            <Input
              id="instance"
              value={instanceNumber}
              onChange={(e) => setInstanceNumber(e.target.value)}
              placeholder="5584998973484"
              data-testid="input-instance"
            />
          </div>
          <div>
            <Label htmlFor="test-number">Número de Teste (Destinatário)</Label>
            <Input
              id="test-number"
              value={testNumber}
              onChange={(e) => setTestNumber(e.target.value)}
              placeholder="5584998973484"
              data-testid="input-test-number"
            />
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Send Message */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Send className="h-5 w-5" />
              Enviar Mensagem
            </CardTitle>
            <CardDescription>POST /send/text</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="message">Mensagem</Label>
              <Textarea
                id="message"
                value={messageText}
                onChange={(e) => setMessageText(e.target.value)}
                placeholder="Digite uma mensagem"
                rows={3}
                data-testid="input-message"
              />
            </div>
            <Button
              onClick={() =>
                sendMessageMutation.mutate({
                  instanceNumber,
                  recipientNumber: testNumber,
                  text: messageText,
                })
              }
              disabled={sendMessageMutation.isPending}
              className="w-full"
              data-testid="button-send"
            >
              {sendMessageMutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <Send className="h-4 w-4 mr-2" />
              )}
              Enviar Mensagem
            </Button>
          </CardContent>
        </Card>

        {/* React to Message */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Smile className="h-5 w-5" />
              Reagir à Mensagem
            </CardTitle>
            <CardDescription>POST /message/react</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="msg-id">ID da Mensagem</Label>
              <Input
                id="msg-id"
                value={messageId}
                onChange={(e) => setMessageId(e.target.value)}
                placeholder="Cole o ID da mensagem"
                data-testid="input-message-id"
              />
            </div>
            <div>
              <Label htmlFor="emoji">Emoji</Label>
              <Input
                id="emoji"
                value={emojiText}
                onChange={(e) => setEmojiText(e.target.value)}
                placeholder="👍"
                data-testid="input-emoji"
              />
            </div>
            <Button
              onClick={() =>
                reactMutation.mutate({
                  instanceNumber,
                  number: testNumber,
                  text: emojiText,
                  id: messageId,
                })
              }
              disabled={reactMutation.isPending || !messageId}
              className="w-full"
              data-testid="button-react"
            >
              {reactMutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <Smile className="h-4 w-4 mr-2" />
              )}
              Adicionar Reação
            </Button>
          </CardContent>
        </Card>

        {/* Delete Message */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Trash2 className="h-5 w-5" />
              Deletar Mensagem
            </CardTitle>
            <CardDescription>POST /message/delete</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="del-msg-id">ID da Mensagem</Label>
              <Input
                id="del-msg-id"
                value={messageId}
                onChange={(e) => setMessageId(e.target.value)}
                placeholder="Cole o ID da mensagem"
                data-testid="input-delete-id"
              />
            </div>
            <Button
              onClick={() =>
                deleteMutation.mutate({
                  instanceNumber,
                  id: messageId,
                })
              }
              disabled={deleteMutation.isPending || !messageId}
              variant="destructive"
              className="w-full"
              data-testid="button-delete"
            >
              {deleteMutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <Trash2 className="h-4 w-4 mr-2" />
              )}
              Deletar Mensagem
            </Button>
          </CardContent>
        </Card>

        {/* Presence */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CheckCheck className="h-5 w-5" />
              Atualizar Presença
            </CardTitle>
            <CardDescription>POST /message/presence</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex gap-2">
              <Button
                onClick={() =>
                  presenceMutation.mutate({
                    instanceNumber,
                    number: testNumber,
                    presence: "composing",
                    delay: 5,
                  })
                }
                disabled={presenceMutation.isPending}
                variant="outline"
                className="flex-1"
                data-testid="button-typing"
              >
                Digitando...
              </Button>
              <Button
                onClick={() =>
                  presenceMutation.mutate({
                    instanceNumber,
                    number: testNumber,
                    presence: "recording",
                    delay: 5,
                  })
                }
                disabled={presenceMutation.isPending}
                variant="outline"
                className="flex-1"
                data-testid="button-recording"
              >
                Gravando áudio
              </Button>
            </div>
            <Button
              onClick={() =>
                presenceMutation.mutate({
                  instanceNumber,
                  number: testNumber,
                  presence: "paused",
                })
              }
              disabled={presenceMutation.isPending}
              variant="outline"
              className="w-full"
              data-testid="button-paused"
            >
              Parar presença
            </Button>
          </CardContent>
        </Card>

        {/* Archive Chat */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Archive className="h-5 w-5" />
              Arquivar Chat
            </CardTitle>
            <CardDescription>POST /chat/archive</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex gap-2">
              <Button
                onClick={() =>
                  archiveMutation.mutate({
                    instanceNumber,
                    number: testNumber,
                    archive: true,
                  })
                }
                disabled={archiveMutation.isPending}
                variant="outline"
                className="flex-1"
                data-testid="button-archive"
              >
                Arquivar
              </Button>
              <Button
                onClick={() =>
                  archiveMutation.mutate({
                    instanceNumber,
                    number: testNumber,
                    archive: false,
                  })
                }
                disabled={archiveMutation.isPending}
                variant="outline"
                className="flex-1"
                data-testid="button-unarchive"
              >
                Desarquivar
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Pin Chat */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Pin className="h-5 w-5" />
              Fixar Chat
            </CardTitle>
            <CardDescription>POST /chat/pin</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex gap-2">
              <Button
                onClick={() =>
                  pinMutation.mutate({
                    instanceNumber,
                    number: testNumber,
                    pin: true,
                  })
                }
                disabled={pinMutation.isPending}
                variant="outline"
                className="flex-1"
                data-testid="button-pin"
              >
                Fixar
              </Button>
              <Button
                onClick={() =>
                  pinMutation.mutate({
                    instanceNumber,
                    number: testNumber,
                    pin: false,
                  })
                }
                disabled={pinMutation.isPending}
                variant="outline"
                className="flex-1"
                data-testid="button-unpin"
              >
                Desafixar
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Mark Chat Read */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Eye className="h-5 w-5" />
              Marcar Chat
            </CardTitle>
            <CardDescription>POST /chat/read</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex gap-2">
              <Button
                onClick={() =>
                  readChatMutation.mutate({
                    instanceNumber,
                    number: testNumber,
                    read: true,
                  })
                }
                disabled={readChatMutation.isPending}
                variant="outline"
                className="flex-1"
                data-testid="button-mark-read"
              >
                Marcar como lido
              </Button>
              <Button
                onClick={() =>
                  readChatMutation.mutate({
                    instanceNumber,
                    number: testNumber,
                    read: false,
                  })
                }
                disabled={readChatMutation.isPending}
                variant="outline"
                className="flex-1"
                data-testid="button-mark-unread"
              >
                Marcar não lido
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Check Numbers */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Phone className="h-5 w-5" />
              Verificar Números
            </CardTitle>
            <CardDescription>POST /chat/check</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Button
              onClick={() =>
                checkNumbersMutation.mutate({
                  instanceNumber,
                  numbers: [testNumber, "5584999999999"],
                })
              }
              disabled={checkNumbersMutation.isPending}
              variant="outline"
              className="w-full"
              data-testid="button-check-numbers"
            >
              {checkNumbersMutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <Phone className="h-4 w-4 mr-2" />
              )}
              Verificar Números
            </Button>
          </CardContent>
        </Card>

        {/* Instance Status */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CheckCheck className="h-5 w-5" />
              Status da Instância
            </CardTitle>
            <CardDescription>GET /instance/status</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Button
              onClick={() => statusMutation.mutate(instanceNumber)}
              disabled={statusMutation.isPending}
              variant="outline"
              className="w-full"
              data-testid="button-status"
            >
              {statusMutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <CheckCheck className="h-4 w-4 mr-2" />
              )}
              Buscar Status
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
