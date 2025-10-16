import { useState } from "react";
import { WhatsAppHeader } from "@/components/WhatsAppHeader";

export default function WhatsApp() {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedChatId, setSelectedChatId] = useState<string | null>(null);

  return (
    <div className="h-screen flex flex-col">
      {/* Header Superior */}
      <WhatsAppHeader searchQuery={searchQuery} onSearchChange={setSearchQuery} />

      {/* Main Content - WhatsApp Layout */}
      <div className="flex-1 flex overflow-hidden">
        {/* Lista de Conversas (Esquerda) */}
        <div className="w-[400px] border-r flex flex-col bg-card">
          <div className="p-3 border-b">
            <h2 className="font-semibold text-lg">Conversas</h2>
          </div>
          
          <div className="flex-1 overflow-y-auto">
            <div className="p-4 text-center text-muted-foreground">
              <p>Carregando conversas do Evolution...</p>
            </div>
          </div>
        </div>

        {/* Área de Mensagens (Direita) */}
        <div className="flex-1 flex flex-col">
          {selectedChatId ? (
            <>
              {/* Header do Chat */}
              <div className="h-16 border-b px-4 flex items-center gap-3">
                <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                  <span className="text-sm font-medium">?</span>
                </div>
                <div className="flex-1">
                  <h3 className="font-medium">Nome do Contato</h3>
                  <p className="text-xs text-muted-foreground">online</p>
                </div>
              </div>

              {/* Mensagens */}
              <div className="flex-1 overflow-y-auto p-4 bg-muted/5">
                <div className="text-center text-muted-foreground">
                  <p>Sem mensagens ainda</p>
                </div>
              </div>

              {/* Input de Mensagem */}
              <div className="h-16 border-t px-4 flex items-center gap-2">
                <p className="text-sm text-muted-foreground">Modo somente leitura</p>
              </div>
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center">
              <div className="text-center space-y-2">
                <div className="text-6xl">💬</div>
                <h3 className="text-xl font-medium">Monitor IA - WhatsApp</h3>
                <p className="text-muted-foreground">
                  Selecione uma conversa para visualizar as mensagens
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
