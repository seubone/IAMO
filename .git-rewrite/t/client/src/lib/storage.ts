/**
 * Storage Utilities - Persistência simples e confiável
 * Usa localStorage com interface de "cookies"
 */

// ============================================
// THEME STORAGE
// ============================================

const THEME_KEY = "app_theme";

export function setTheme(theme: "light" | "dark"): void {
  try {
    localStorage.setItem(THEME_KEY, theme);
    console.log(`💾 Tema salvo: ${theme}`);
  } catch (error) {
    console.error("Erro ao salvar tema:", error);
  }
}

export function getTheme(): "light" | "dark" | null {
  try {
    const theme = localStorage.getItem(THEME_KEY);
    if (theme === "light" || theme === "dark") {
      return theme;
    }
  } catch (error) {
    console.error("Erro ao recuperar tema:", error);
  }
  return null;
}

// ============================================
// INSTANCE STORAGE
// ============================================

const INSTANCE_KEY = "selected_instance_id";

export function setSelectedInstanceId(instanceId: string): void {
  try {
    localStorage.setItem(INSTANCE_KEY, instanceId);
    console.log(`💾 Instância salva: ${instanceId}`);
  } catch (error) {
    console.error("Erro ao salvar instância:", error);
  }
}

export function getSelectedInstanceId(): string | null {
  try {
    return localStorage.getItem(INSTANCE_KEY);
  } catch (error) {
    console.error("Erro ao recuperar instância:", error);
  }
  return null;
}

export function deleteSelectedInstanceId(): void {
  try {
    localStorage.removeItem(INSTANCE_KEY);
    console.log("🗑️ Instância deletada");
  } catch (error) {
    console.error("Erro ao deletar instância:", error);
  }
}

// ============================================
// MESSAGE DRAFT STORAGE
// ============================================

const DRAFT_KEY = "message_draft";

interface MessageDraft {
  instanceId: string;
  chatJid: string;
  text: string;
  timestamp: number;
}

export function setMessageDraft(
  instanceId: string,
  chatJid: string,
  text: string
): void {
  try {
    if (!text.trim()) {
      deleteMessageDraft();
      return;
    }

    const draft: MessageDraft = {
      instanceId,
      chatJid,
      text,
      timestamp: Date.now(),
    };

    localStorage.setItem(DRAFT_KEY, JSON.stringify(draft));
    console.log(`💾 Rascunho salvo: "${text.substring(0, 30)}..."`);
  } catch (error) {
    console.error("Erro ao salvar rascunho:", error);
  }
}

export function getMessageDraft(
  instanceId: string,
  chatJid: string
): string | null {
  try {
    const draftJson = localStorage.getItem(DRAFT_KEY);
    if (!draftJson) return null;

    const draft: MessageDraft = JSON.parse(draftJson);

    // Verificar se é do mesmo chat
    if (draft.instanceId === instanceId && draft.chatJid === chatJid) {
      console.log(
        `📝 Rascunho restaurado: "${draft.text.substring(0, 30)}..."`
      );
      return draft.text;
    }

    return null;
  } catch (error) {
    console.error("Erro ao recuperar rascunho:", error);
    return null;
  }
}

export function deleteMessageDraft(): void {
  try {
    localStorage.removeItem(DRAFT_KEY);
    console.log("🗑️ Rascunho deletado");
  } catch (error) {
    console.error("Erro ao deletar rascunho:", error);
  }
}
