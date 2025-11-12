import { pgTable, text, varchar, timestamp, jsonb, integer, boolean, bigint } from "drizzle-orm/pg-core";

// Evolution Database Schema - Read-only for WhatsApp mirroring

// Chat (Conversas)
export const evolutionChat = pgTable("chat", {
  id: text("id").primaryKey(),
  jid: text("jid").notNull(), // JID do WhatsApp (ex: 5511999999999@s.whatsapp.net)
  title: text("title"), // Nome do chat (pode ser vazio para 1:1)
  photoUrl: text("photo_url"),
  createdAt: timestamp("created_at", { mode: 'string' }).notNull(),
  updatedAt: timestamp("updated_at", { mode: 'string' }).notNull(),
});

// Message (Mensagens)
export const evolutionMessage = pgTable("message", {
  id: text("id").primaryKey(),
  chatId: text("chat_id").notNull(),
  keyMetaJson: jsonb("key_meta_json"), // { id, fromMe, remoteJid, participant }
  type: text("type").notNull(), // conversation, imageMessage, audioMessage, documentMessage, etc
  contentJson: jsonb("content_json"), // Conteúdo específico por tipo
  contextJson: jsonb("context_json"), // Contexto, quotes, etc
  origin: text("origin"), // web, api, bot
  timestamp: bigint("timestamp", { mode: 'number' }).notNull(), // Epoch em segundos
  status: text("status").notNull(), // PENDING, SENDING, SENT, DELIVERED, READ, FAILED
  trackId: text("track_id"), // UUID para idempotência
  uazapiMessageId: text("uazapi_message_id"),
  createdAt: timestamp("created_at", { mode: 'string' }).notNull(),
  updatedAt: timestamp("updated_at", { mode: 'string' }).notNull(),
});

// Contact (Contatos)
export const evolutionContact = pgTable("contact", {
  id: text("id").primaryKey(),
  jid: text("jid").notNull().unique(),
  name: text("name"),
  photoUrl: text("photo_url"),
  bio: text("bio"),
  createdAt: timestamp("created_at", { mode: 'string' }).notNull(),
  updatedAt: timestamp("updated_at", { mode: 'string' }).notNull(),
});

// Instance (Instância do WhatsApp)
export const evolutionInstance = pgTable("instance", {
  id: text("id").primaryKey(),
  status: text("status").notNull(), // open, connecting, close
  name: text("name"),
  photoUrl: text("photo_url"),
  number: text("number"),
  createdAt: timestamp("created_at", { mode: 'string' }).notNull(),
  updatedAt: timestamp("updated_at", { mode: 'string' }).notNull(),
});

// Types for frontend use
export type EvolutionChat = typeof evolutionChat.$inferSelect;
export type EvolutionMessage = typeof evolutionMessage.$inferSelect;
export type EvolutionContact = typeof evolutionContact.$inferSelect;
export type EvolutionInstance = typeof evolutionInstance.$inferSelect;

// Helper types for message parsing
export interface MessageKeyMeta {
  id: string;
  fromMe: boolean;
  remoteJid: string;
  participant?: string; // For group messages
}

export interface ConversationMessage {
  conversation: string;
}

export interface ImageMessage {
  url?: string;
  caption?: string;
  width?: number;
  height?: number;
  mimetype?: string;
  jpegThumbnail?: string;
}

export interface AudioMessage {
  url?: string;
  mimetype?: string;
  seconds?: number;
  ptt?: boolean; // Push-to-talk
}

export interface DocumentMessage {
  url?: string;
  mimetype?: string;
  fileName?: string;
  caption?: string;
}

// Unified message content
export type MessageContent = 
  | ConversationMessage 
  | ImageMessage 
  | AudioMessage 
  | DocumentMessage;

// Frontend-friendly message type
export interface WhatsAppMessage {
  id: string;
  chatId: string;
  jid: string;
  participant?: string;
  direction: 'in' | 'out';
  type: string;
  timestamp: number;
  status: string;
  content: MessageContent;
  contextJson?: any;
}
