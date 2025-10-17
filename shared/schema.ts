import { sql } from "drizzle-orm";
import { pgTable, text, varchar, timestamp, jsonb, integer } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Users with RBAC
export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  password: text("password").notNull(),
  role: text("role").notNull().default("viewer"), // admin, operator, viewer
  avatar: text("avatar"),
  preferences: jsonb("preferences"), // UI preferences, notifications, etc
  personalIntegrations: jsonb("personal_integrations"), // Personal API keys, tokens
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// IAs
export const ias = pgTable("ias", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  status: text("status").notNull().default("active"), // active, paused, inactive
  tags: text("tags").array(),
  parameters: jsonb("parameters"), // AI parameters, prompts, configs
  statusHistory: jsonb("status_history"), // Audit trail of status transitions
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Tickets
export const tickets = pgTable("tickets", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  iaId: varchar("ia_id").notNull().references(() => ias.id),
  attendanceId: text("attendance_id").notNull(),
  errorType: text("error_type").notNull(), // automation, prompt, negotiation
  severity: text("severity").notNull(), // low, medium, high, critical
  message: text("message").notNull(),
  suggestion: text("suggestion"),
  origin: text("origin").notNull(),
  status: text("status").notNull().default("new"), // new, in_progress, resolved
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Actions (Audit Log)
export const actions = pgTable("actions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  iaId: varchar("ia_id").notNull().references(() => ias.id),
  userId: varchar("user_id").notNull().references(() => users.id),
  action: text("action").notNull(), // IA Ativada, IA Pausada, IA Inativada
  reason: text("reason").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Conversations
export const conversations = pgTable("conversations", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  iaId: varchar("ia_id").notNull().references(() => ias.id),
  attendanceId: text("attendance_id").notNull().unique(),
  leadName: text("lead_name"),
  channel: text("channel"), // whatsapp, email, telegram, etc
  iaEnabled: integer("ia_enabled").notNull().default(1), // 1 = true, 0 = false
  notes: text("notes"),
  metadata: jsonb("metadata"), // Extra data like contact info, tags, etc
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Messages
export const messages = pgTable("messages", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  conversationId: varchar("conversation_id").notNull().references(() => conversations.id),
  sender: text("sender").notNull(), // ia, user, system
  content: text("content").notNull(),
  attachments: jsonb("attachments"), // Files, images, documents
  actions: jsonb("actions"), // Actions performed on this message
  tags: text("tags").array(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Metrics
export const metrics = pgTable("metrics", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  iaId: varchar("ia_id").notNull().references(() => ias.id),
  date: timestamp("date").notNull(),
  firstResponseRate: text("first_response_rate"),
  salesConversion: text("sales_conversion"),
  quoteConversion: text("quote_conversion"),
  paymentLinkConversion: text("payment_link_conversion"),
  iaMessagePercentage: text("ia_message_percentage"),
  totalMessages: integer("total_messages").notNull().default(0),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Global Settings
export const settings = pgTable("settings", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  key: text("key").notNull().unique(), // Setting identifier
  value: jsonb("value").notNull(), // Setting value (flexible JSON)
  category: text("category").notNull(), // integrations, webhooks, slas, notifications, permissions
  description: text("description"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Uazapi Instances (tokens vinculados por número de instância)
export const uazapiInstances = pgTable("uazapi_instances", {
  instanceNumber: text("instance_number").primaryKey(), // Número no formato brasileiro 55XXYYYYYYYY
  apiToken: text("api_token").notNull(), // Token da instância no Uazapi
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Contact Metadata (tags and custom fields for WhatsApp contacts)
export const contactMetadata = pgTable("contact_metadata", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  instanceId: text("instance_id").notNull(), // Evolution instance ID
  remoteJid: text("remote_jid").notNull(), // WhatsApp JID (unique per instance)
  tags: text("tags").array(), // Array of tags
  customFields: jsonb("custom_fields"), // Flexible custom fields as JSON
  notes: text("notes"), // Additional notes
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Insert Schemas
export const insertUserSchema = createInsertSchema(users).omit({ id: true, createdAt: true, updatedAt: true });
export const insertIASchema = createInsertSchema(ias).omit({ id: true, createdAt: true, updatedAt: true });
export const insertTicketSchema = createInsertSchema(tickets).omit({ id: true, createdAt: true });
export const insertActionSchema = createInsertSchema(actions).omit({ id: true, createdAt: true });
export const insertConversationSchema = createInsertSchema(conversations).omit({ id: true, createdAt: true, updatedAt: true });
export const insertMessageSchema = createInsertSchema(messages).omit({ id: true, createdAt: true });
export const insertMetricSchema = createInsertSchema(metrics).omit({ id: true, createdAt: true });
export const insertSettingSchema = createInsertSchema(settings).omit({ id: true, createdAt: true, updatedAt: true });
export const insertUazapiInstanceSchema = createInsertSchema(uazapiInstances).omit({ createdAt: true, updatedAt: true });
export const insertContactMetadataSchema = createInsertSchema(contactMetadata).omit({ id: true, createdAt: true, updatedAt: true });

// Types
export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;
export type InsertContactMetadata = z.infer<typeof insertContactMetadataSchema>;
export type ContactMetadata = typeof contactMetadata.$inferSelect;

export type InsertIA = z.infer<typeof insertIASchema>;
export type IA = typeof ias.$inferSelect;

export type InsertTicket = z.infer<typeof insertTicketSchema>;
export type Ticket = typeof tickets.$inferSelect;

export type InsertAction = z.infer<typeof insertActionSchema>;
export type Action = typeof actions.$inferSelect;

export type InsertConversation = z.infer<typeof insertConversationSchema>;
export type Conversation = typeof conversations.$inferSelect;

export type InsertMessage = z.infer<typeof insertMessageSchema>;
export type Message = typeof messages.$inferSelect;

export type InsertMetric = z.infer<typeof insertMetricSchema>;
export type Metric = typeof metrics.$inferSelect;

export type InsertSetting = z.infer<typeof insertSettingSchema>;
export type Setting = typeof settings.$inferSelect;

export type InsertUazapiInstance = z.infer<typeof insertUazapiInstanceSchema>;
export type UazapiInstance = typeof uazapiInstances.$inferSelect;
