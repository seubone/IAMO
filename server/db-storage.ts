import { eq, desc } from "drizzle-orm";
import { db } from "./db";
import {
  users,
  ias,
  tickets,
  actions,
  conversations,
  messages,
  metrics,
  type User,
  type IA,
  type Ticket,
  type Action,
  type Conversation,
  type Message,
  type Metric,
  type InsertUser,
  type InsertIA,
  type InsertTicket,
  type InsertAction,
  type InsertConversation,
  type InsertMessage,
  type InsertMetric,
} from "../shared/schema";
import type { IStorage } from "./storage";

export class DatabaseStorage implements IStorage {
  // Users
  async getUsers(): Promise<User[]> {
    return await db.select().from(users);
  }

  async getUser(id: string): Promise<User | undefined> {
    const result = await db.select().from(users).where(eq(users.id, id));
    return result[0];
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    const result = await db.select().from(users).where(eq(users.email, email));
    return result[0];
  }

  async createUser(data: InsertUser): Promise<User> {
    const result = await db.insert(users).values(data).returning();
    return result[0];
  }

  async updateUser(id: string, data: Partial<InsertUser>): Promise<User | undefined> {
    const result = await db
      .update(users)
      .set(data)
      .where(eq(users.id, id))
      .returning();
    return result[0];
  }

  // IAs
  async getAllIAs(): Promise<IA[]> {
    return await db.select().from(ias).orderBy(desc(ias.createdAt));
  }

  async getIA(id: string): Promise<IA | undefined> {
    const result = await db.select().from(ias).where(eq(ias.id, id));
    return result[0];
  }

  async createIA(data: InsertIA): Promise<IA> {
    const result = await db.insert(ias).values(data).returning();
    return result[0];
  }

  async updateIA(id: string, data: Partial<InsertIA>): Promise<IA | undefined> {
    const result = await db
      .update(ias)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(ias.id, id))
      .returning();
    return result[0];
  }

  // Tickets
  async getAllTickets(): Promise<Ticket[]> {
    return await db.select().from(tickets).orderBy(desc(tickets.createdAt));
  }

  async getTicket(id: string): Promise<Ticket | undefined> {
    const result = await db.select().from(tickets).where(eq(tickets.id, id));
    return result[0];
  }

  async getTicketsByIA(iaId: string): Promise<Ticket[]> {
    return await db
      .select()
      .from(tickets)
      .where(eq(tickets.iaId, iaId))
      .orderBy(desc(tickets.createdAt));
  }

  async createTicket(data: InsertTicket): Promise<Ticket> {
    const result = await db.insert(tickets).values(data).returning();
    return result[0];
  }

  async updateTicket(id: string, data: Partial<InsertTicket>): Promise<Ticket | undefined> {
    const result = await db
      .update(tickets)
      .set(data)
      .where(eq(tickets.id, id))
      .returning();
    return result[0];
  }

  // Actions
  async getAllActions(): Promise<Action[]> {
    return await db.select().from(actions).orderBy(desc(actions.createdAt));
  }

  async getActionsByIA(iaId: string): Promise<Action[]> {
    return await db
      .select()
      .from(actions)
      .where(eq(actions.iaId, iaId))
      .orderBy(desc(actions.createdAt));
  }

  async createAction(data: InsertAction): Promise<Action> {
    const result = await db.insert(actions).values(data).returning();
    return result[0];
  }

  // Conversations
  async getAllConversations(): Promise<Conversation[]> {
    return await db
      .select()
      .from(conversations)
      .orderBy(desc(conversations.createdAt));
  }

  async getConversation(id: string): Promise<Conversation | undefined> {
    const result = await db
      .select()
      .from(conversations)
      .where(eq(conversations.id, id));
    return result[0];
  }

  async getConversationByAttendanceId(
    attendanceId: string
  ): Promise<Conversation | undefined> {
    const result = await db
      .select()
      .from(conversations)
      .where(eq(conversations.attendanceId, attendanceId));
    return result[0];
  }

  async createConversation(data: InsertConversation): Promise<Conversation> {
    const result = await db.insert(conversations).values(data).returning();
    return result[0];
  }

  async updateConversation(
    id: string,
    data: Partial<InsertConversation>
  ): Promise<Conversation | undefined> {
    const result = await db
      .update(conversations)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(conversations.id, id))
      .returning();
    return result[0];
  }

  // Messages
  async getMessagesByConversation(conversationId: string): Promise<Message[]> {
    return await db
      .select()
      .from(messages)
      .where(eq(messages.conversationId, conversationId))
      .orderBy(messages.createdAt);
  }

  async createMessage(data: InsertMessage): Promise<Message> {
    const result = await db.insert(messages).values(data).returning();
    return result[0];
  }

  // Metrics
  async getMetricsByIA(iaId: string): Promise<Metric[]> {
    return await db
      .select()
      .from(metrics)
      .where(eq(metrics.iaId, iaId))
      .orderBy(desc(metrics.date));
  }

  async createMetric(data: InsertMetric): Promise<Metric> {
    const result = await db.insert(metrics).values(data).returning();
    return result[0];
  }
}

export const dbStorage = new DatabaseStorage();
