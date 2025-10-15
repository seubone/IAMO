import type {
  User, InsertUser,
  IA, InsertIA,
  Ticket, InsertTicket,
  Action, InsertAction,
  Conversation, InsertConversation,
  Message, InsertMessage,
  Metric, InsertMetric
} from "@shared/schema";
import { randomUUID } from "crypto";

// Storage interface with all CRUD operations
export interface IStorage {
  // Users
  getUser(id: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  updateUser(id: string, user: Partial<InsertUser>): Promise<User | undefined>;
  
  // IAs
  getAllIAs(): Promise<IA[]>;
  getIA(id: string): Promise<IA | undefined>;
  createIA(ia: InsertIA): Promise<IA>;
  updateIA(id: string, ia: Partial<InsertIA>): Promise<IA | undefined>;
  deleteIA(id: string): Promise<boolean>;
  
  // Tickets
  getAllTickets(): Promise<Ticket[]>;
  getTicket(id: string): Promise<Ticket | undefined>;
  getTicketsByIA(iaId: string): Promise<Ticket[]>;
  createTicket(ticket: InsertTicket): Promise<Ticket>;
  updateTicket(id: string, ticket: Partial<InsertTicket>): Promise<Ticket | undefined>;
  
  // Actions (Audit)
  getAllActions(): Promise<Action[]>;
  getActionsByIA(iaId: string): Promise<Action[]>;
  createAction(action: InsertAction): Promise<Action>;
  
  // Conversations
  getAllConversations(): Promise<Conversation[]>;
  getConversation(id: string): Promise<Conversation | undefined>;
  getConversationByAttendanceId(attendanceId: string): Promise<Conversation | undefined>;
  createConversation(conversation: InsertConversation): Promise<Conversation>;
  updateConversation(id: string, conversation: Partial<InsertConversation>): Promise<Conversation | undefined>;
  
  // Messages
  getMessagesByConversation(conversationId: string): Promise<Message[]>;
  createMessage(message: InsertMessage): Promise<Message>;
  
  // Metrics
  getMetricsByIA(iaId: string): Promise<Metric[]>;
  createMetric(metric: InsertMetric): Promise<Metric>;
}

export class MemStorage implements IStorage {
  private users: Map<string, User>;
  private ias: Map<string, IA>;
  private tickets: Map<string, Ticket>;
  private actions: Map<string, Action>;
  private conversations: Map<string, Conversation>;
  private messages: Map<string, Message>;
  private metrics: Map<string, Metric>;

  constructor() {
    this.users = new Map();
    this.ias = new Map();
    this.tickets = new Map();
    this.actions = new Map();
    this.conversations = new Map();
    this.messages = new Map();
    this.metrics = new Map();
  }

  // Users
  async getUser(id: string): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find((user) => user.email === email);
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = randomUUID();
    const user: User = { 
      ...insertUser,
      role: insertUser.role ?? "viewer",
      preferences: insertUser.preferences ?? null,
      id,
      createdAt: new Date(),
    };
    this.users.set(id, user);
    return user;
  }

  async updateUser(id: string, insertUser: Partial<InsertUser>): Promise<User | undefined> {
    const user = this.users.get(id);
    if (!user) return undefined;
    
    const updated = { ...user, ...insertUser };
    this.users.set(id, updated);
    return updated;
  }

  // IAs
  async getAllIAs(): Promise<IA[]> {
    return Array.from(this.ias.values());
  }

  async getIA(id: string): Promise<IA | undefined> {
    return this.ias.get(id);
  }

  async createIA(insertIA: InsertIA): Promise<IA> {
    const id = randomUUID();
    const now = new Date();
    const ia: IA = {
      ...insertIA,
      status: insertIA.status ?? "active",
      tags: insertIA.tags ?? null,
      id,
      createdAt: now,
      updatedAt: now,
    };
    this.ias.set(id, ia);
    return ia;
  }

  async updateIA(id: string, insertIA: Partial<InsertIA>): Promise<IA | undefined> {
    const ia = this.ias.get(id);
    if (!ia) return undefined;
    
    const updated = { 
      ...ia, 
      ...insertIA,
      updatedAt: new Date(),
    };
    this.ias.set(id, updated);
    return updated;
  }

  async deleteIA(id: string): Promise<boolean> {
    return this.ias.delete(id);
  }

  // Tickets
  async getAllTickets(): Promise<Ticket[]> {
    return Array.from(this.tickets.values());
  }

  async getTicket(id: string): Promise<Ticket | undefined> {
    return this.tickets.get(id);
  }

  async getTicketsByIA(iaId: string): Promise<Ticket[]> {
    return Array.from(this.tickets.values()).filter(t => t.iaId === iaId);
  }

  async createTicket(insertTicket: InsertTicket): Promise<Ticket> {
    const id = randomUUID();
    const ticket: Ticket = {
      ...insertTicket,
      status: insertTicket.status ?? "new",
      suggestion: insertTicket.suggestion ?? null,
      id,
      createdAt: new Date(),
    };
    this.tickets.set(id, ticket);
    return ticket;
  }

  async updateTicket(id: string, insertTicket: Partial<InsertTicket>): Promise<Ticket | undefined> {
    const ticket = this.tickets.get(id);
    if (!ticket) return undefined;
    
    const updated = { ...ticket, ...insertTicket };
    this.tickets.set(id, updated);
    return updated;
  }

  // Actions
  async getAllActions(): Promise<Action[]> {
    return Array.from(this.actions.values());
  }

  async getActionsByIA(iaId: string): Promise<Action[]> {
    return Array.from(this.actions.values()).filter(a => a.iaId === iaId);
  }

  async createAction(insertAction: InsertAction): Promise<Action> {
    const id = randomUUID();
    const action: Action = {
      ...insertAction,
      id,
      createdAt: new Date(),
    };
    this.actions.set(id, action);
    return action;
  }

  // Conversations
  async getAllConversations(): Promise<Conversation[]> {
    return Array.from(this.conversations.values());
  }

  async getConversation(id: string): Promise<Conversation | undefined> {
    return this.conversations.get(id);
  }

  async getConversationByAttendanceId(attendanceId: string): Promise<Conversation | undefined> {
    return Array.from(this.conversations.values()).find(c => c.attendanceId === attendanceId);
  }

  async createConversation(insertConversation: InsertConversation): Promise<Conversation> {
    const id = randomUUID();
    const now = new Date();
    const conversation: Conversation = {
      ...insertConversation,
      leadName: insertConversation.leadName ?? null,
      iaEnabled: insertConversation.iaEnabled ?? 1,
      notes: insertConversation.notes ?? null,
      id,
      createdAt: now,
      updatedAt: now,
    };
    this.conversations.set(id, conversation);
    return conversation;
  }

  async updateConversation(id: string, insertConversation: Partial<InsertConversation>): Promise<Conversation | undefined> {
    const conversation = this.conversations.get(id);
    if (!conversation) return undefined;
    
    const updated = {
      ...conversation,
      ...insertConversation,
      updatedAt: new Date(),
    };
    this.conversations.set(id, updated);
    return updated;
  }

  // Messages
  async getMessagesByConversation(conversationId: string): Promise<Message[]> {
    return Array.from(this.messages.values()).filter(m => m.conversationId === conversationId);
  }

  async createMessage(insertMessage: InsertMessage): Promise<Message> {
    const id = randomUUID();
    const message: Message = {
      ...insertMessage,
      tags: insertMessage.tags ?? null,
      id,
      createdAt: new Date(),
    };
    this.messages.set(id, message);
    return message;
  }

  // Metrics
  async getMetricsByIA(iaId: string): Promise<Metric[]> {
    return Array.from(this.metrics.values()).filter(m => m.iaId === iaId);
  }

  async createMetric(insertMetric: InsertMetric): Promise<Metric> {
    const id = randomUUID();
    const metric: Metric = {
      ...insertMetric,
      firstResponseRate: insertMetric.firstResponseRate ?? null,
      salesConversion: insertMetric.salesConversion ?? null,
      quoteConversion: insertMetric.quoteConversion ?? null,
      paymentLinkConversion: insertMetric.paymentLinkConversion ?? null,
      iaMessagePercentage: insertMetric.iaMessagePercentage ?? null,
      totalMessages: insertMetric.totalMessages ?? 0,
      id,
      createdAt: new Date(),
    };
    this.metrics.set(id, metric);
    return metric;
  }
}

export const storage = new MemStorage();
