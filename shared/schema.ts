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
  preferences: jsonb("preferences"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// IAs
export const ias = pgTable("ias", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  status: text("status").notNull().default("active"), // active, paused, inactive
  tags: text("tags").array(),
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
  iaEnabled: integer("ia_enabled").notNull().default(1), // 1 = true, 0 = false
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Messages
export const messages = pgTable("messages", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  conversationId: varchar("conversation_id").notNull().references(() => conversations.id),
  sender: text("sender").notNull(), // ia, user, system
  content: text("content").notNull(),
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

// Insert Schemas
export const insertUserSchema = createInsertSchema(users).omit({ id: true, createdAt: true });
export const insertIASchema = createInsertSchema(ias).omit({ id: true, createdAt: true, updatedAt: true });
export const insertTicketSchema = createInsertSchema(tickets).omit({ id: true, createdAt: true });
export const insertActionSchema = createInsertSchema(actions).omit({ id: true, createdAt: true });
export const insertConversationSchema = createInsertSchema(conversations).omit({ id: true, createdAt: true, updatedAt: true });
export const insertMessageSchema = createInsertSchema(messages).omit({ id: true, createdAt: true });
export const insertMetricSchema = createInsertSchema(metrics).omit({ id: true, createdAt: true });

// Types
export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;

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
