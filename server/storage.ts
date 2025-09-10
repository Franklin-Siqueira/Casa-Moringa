import { 
  type Property, type InsertProperty,
  type Guest, type InsertGuest,
  type Booking, type InsertBooking,
  type MaintenanceTask, type InsertMaintenanceTask,
  type Expense, type InsertExpense,
  type Message, type InsertMessage,
  type BookingWithGuest,
  type MessageWithRelations
} from "@shared/schema";
import { randomUUID } from "crypto";

export interface IStorage {
  // Properties
  getProperties(): Promise<Property[]>;
  getProperty(id: string): Promise<Property | undefined>;
  createProperty(property: InsertProperty): Promise<Property>;
  updateProperty(id: string, property: Partial<InsertProperty>): Promise<Property | undefined>;
  deleteProperty(id: string): Promise<boolean>;

  // Guests
  getGuests(): Promise<Guest[]>;
  getGuest(id: string): Promise<Guest | undefined>;
  getGuestByEmail(email: string): Promise<Guest | undefined>;
  createGuest(guest: InsertGuest): Promise<Guest>;
  updateGuest(id: string, guest: Partial<InsertGuest>): Promise<Guest | undefined>;
  deleteGuest(id: string): Promise<boolean>;

  // Bookings
  getBookings(): Promise<BookingWithGuest[]>;
  getBooking(id: string): Promise<BookingWithGuest | undefined>;
  getBookingsByProperty(propertyId: string): Promise<BookingWithGuest[]>;
  getBookingsByGuest(guestId: string): Promise<BookingWithGuest[]>;
  getBookingsByDateRange(startDate: Date, endDate: Date): Promise<BookingWithGuest[]>;
  createBooking(booking: InsertBooking): Promise<Booking>;
  updateBooking(id: string, booking: Partial<InsertBooking>): Promise<Booking | undefined>;
  deleteBooking(id: string): Promise<boolean>;

  // Maintenance Tasks
  getMaintenanceTasks(): Promise<MaintenanceTask[]>;
  getMaintenanceTask(id: string): Promise<MaintenanceTask | undefined>;
  getMaintenanceTasksByProperty(propertyId: string): Promise<MaintenanceTask[]>;
  createMaintenanceTask(task: InsertMaintenanceTask): Promise<MaintenanceTask>;
  updateMaintenanceTask(id: string, task: Partial<InsertMaintenanceTask>): Promise<MaintenanceTask | undefined>;
  deleteMaintenanceTask(id: string): Promise<boolean>;

  // Expenses
  getExpenses(): Promise<Expense[]>;
  getExpense(id: string): Promise<Expense | undefined>;
  getExpensesByProperty(propertyId: string): Promise<Expense[]>;
  getExpensesByDateRange(startDate: Date, endDate: Date): Promise<Expense[]>;
  createExpense(expense: InsertExpense): Promise<Expense>;
  updateExpense(id: string, expense: Partial<InsertExpense>): Promise<Expense | undefined>;
  deleteExpense(id: string): Promise<boolean>;

  // Messages
  getMessages(): Promise<MessageWithRelations[]>;
  getMessage(id: string): Promise<MessageWithRelations | undefined>;
  getMessagesByBooking(bookingId: string): Promise<MessageWithRelations[]>;
  getMessagesByGuest(guestId: string): Promise<MessageWithRelations[]>;
  getMessagesByChannel(channel: string): Promise<MessageWithRelations[]>;
  getWhatsAppMessages(phoneNumber?: string): Promise<MessageWithRelations[]>;
  createMessage(message: InsertMessage): Promise<Message>;
  updateMessage(id: string, message: Partial<InsertMessage>): Promise<Message | undefined>;
  updateWhatsAppMessageStatus(whatsappMessageId: string, status: string): Promise<Message | undefined>;
  deleteMessage(id: string): Promise<boolean>;
}

export class MemStorage implements IStorage {
  private properties: Map<string, Property> = new Map();
  private guests: Map<string, Guest> = new Map();
  private bookings: Map<string, Booking> = new Map();
  private maintenanceTasks: Map<string, MaintenanceTask> = new Map();
  private expenses: Map<string, Expense> = new Map();
  private messages: Map<string, Message> = new Map();

  constructor() {
    this.initializeData();
  }

  private initializeData() {
    // Initialize with some basic property data
    const defaultProperty: Property = {
      id: randomUUID(),
      name: "Casa da Praia",
      description: "Beautiful beachfront vacation rental with stunning ocean views",
      address: "123 Ocean Drive, Coastal City",
      maxGuests: 6,
      dailyRate: "400.00",
      amenities: ["Wi-Fi", "Air Conditioning", "Kitchen", "Beach Access", "Parking"],
      photos: [],
      createdAt: new Date(),
    };
    this.properties.set(defaultProperty.id, defaultProperty);
  }

  // Properties
  async getProperties(): Promise<Property[]> {
    return Array.from(this.properties.values());
  }

  async getProperty(id: string): Promise<Property | undefined> {
    return this.properties.get(id);
  }

  async createProperty(property: InsertProperty): Promise<Property> {
    const id = randomUUID();
    const newProperty: Property = {
      ...property,
      description: property.description ?? null,
      maxGuests: property.maxGuests ?? 1,
      amenities: property.amenities ?? null,
      photos: property.photos ?? null,
      id,
      createdAt: new Date(),
    };
    this.properties.set(id, newProperty);
    return newProperty;
  }

  async updateProperty(id: string, property: Partial<InsertProperty>): Promise<Property | undefined> {
    const existing = this.properties.get(id);
    if (!existing) return undefined;
    
    const updated: Property = { ...existing, ...property };
    this.properties.set(id, updated);
    return updated;
  }

  async deleteProperty(id: string): Promise<boolean> {
    return this.properties.delete(id);
  }

  // Guests
  async getGuests(): Promise<Guest[]> {
    return Array.from(this.guests.values());
  }

  async getGuest(id: string): Promise<Guest | undefined> {
    return this.guests.get(id);
  }

  async getGuestByEmail(email: string): Promise<Guest | undefined> {
    return Array.from(this.guests.values()).find(guest => guest.email === email);
  }

  async createGuest(guest: InsertGuest): Promise<Guest> {
    const id = randomUUID();
    const newGuest: Guest = {
      ...guest,
      cpf: guest.cpf ?? null,
      street: guest.street ?? null,
      number: guest.number ?? null,
      complement: guest.complement ?? null,
      city: guest.city ?? null,
      state: guest.state ?? null,
      zipCode: guest.zipCode ?? null,
      document: guest.document ?? null,
      notes: guest.notes ?? null,
      id,
      createdAt: new Date(),
    };
    this.guests.set(id, newGuest);
    return newGuest;
  }

  async updateGuest(id: string, guest: Partial<InsertGuest>): Promise<Guest | undefined> {
    const existing = this.guests.get(id);
    if (!existing) return undefined;
    
    const updated: Guest = { ...existing, ...guest };
    this.guests.set(id, updated);
    return updated;
  }

  async deleteGuest(id: string): Promise<boolean> {
    return this.guests.delete(id);
  }

  // Bookings
  async getBookings(): Promise<BookingWithGuest[]> {
    const bookings = Array.from(this.bookings.values());
    return Promise.all(
      bookings.map(async (booking) => {
        const guest = await this.getGuest(booking.guestId);
        const property = await this.getProperty(booking.propertyId);
        return {
          ...booking,
          guest: guest!,
          property: property!,
        };
      })
    );
  }

  async getBooking(id: string): Promise<BookingWithGuest | undefined> {
    const booking = this.bookings.get(id);
    if (!booking) return undefined;
    
    const guest = await this.getGuest(booking.guestId);
    const property = await this.getProperty(booking.propertyId);
    
    if (!guest || !property) return undefined;
    
    return {
      ...booking,
      guest,
      property,
    };
  }

  async getBookingsByProperty(propertyId: string): Promise<BookingWithGuest[]> {
    const allBookings = await this.getBookings();
    return allBookings.filter(booking => booking.propertyId === propertyId);
  }

  async getBookingsByGuest(guestId: string): Promise<BookingWithGuest[]> {
    const allBookings = await this.getBookings();
    return allBookings.filter(booking => booking.guestId === guestId);
  }

  async getBookingsByDateRange(startDate: Date, endDate: Date): Promise<BookingWithGuest[]> {
    const allBookings = await this.getBookings();
    return allBookings.filter(booking => {
      const checkIn = new Date(booking.checkIn);
      const checkOut = new Date(booking.checkOut);
      return checkIn <= endDate && checkOut >= startDate;
    });
  }

  async createBooking(booking: InsertBooking): Promise<Booking> {
    const id = randomUUID();
    const newBooking: Booking = {
      ...booking,
      status: booking.status ?? "confirmed",
      notes: booking.notes ?? null,
      id,
      createdAt: new Date(),
    };
    this.bookings.set(id, newBooking);
    return newBooking;
  }

  async updateBooking(id: string, booking: Partial<InsertBooking>): Promise<Booking | undefined> {
    const existing = this.bookings.get(id);
    if (!existing) return undefined;
    
    const updated: Booking = { ...existing, ...booking };
    this.bookings.set(id, updated);
    return updated;
  }

  async deleteBooking(id: string): Promise<boolean> {
    return this.bookings.delete(id);
  }

  // Maintenance Tasks
  async getMaintenanceTasks(): Promise<MaintenanceTask[]> {
    return Array.from(this.maintenanceTasks.values());
  }

  async getMaintenanceTask(id: string): Promise<MaintenanceTask | undefined> {
    return this.maintenanceTasks.get(id);
  }

  async getMaintenanceTasksByProperty(propertyId: string): Promise<MaintenanceTask[]> {
    return Array.from(this.maintenanceTasks.values()).filter(task => task.propertyId === propertyId);
  }

  async createMaintenanceTask(task: InsertMaintenanceTask): Promise<MaintenanceTask> {
    const id = randomUUID();
    const newTask: MaintenanceTask = {
      ...task,
      status: task.status ?? "pending",
      description: task.description ?? null,
      notes: task.notes ?? null,
      scheduledDate: task.scheduledDate ?? null,
      completedDate: task.completedDate ?? null,
      assignedTo: task.assignedTo ?? null,
      cost: task.cost ?? null,
      id,
      createdAt: new Date(),
    };
    this.maintenanceTasks.set(id, newTask);
    return newTask;
  }

  async updateMaintenanceTask(id: string, task: Partial<InsertMaintenanceTask>): Promise<MaintenanceTask | undefined> {
    const existing = this.maintenanceTasks.get(id);
    if (!existing) return undefined;
    
    const updated: MaintenanceTask = { ...existing, ...task };
    this.maintenanceTasks.set(id, updated);
    return updated;
  }

  async deleteMaintenanceTask(id: string): Promise<boolean> {
    return this.maintenanceTasks.delete(id);
  }

  // Expenses
  async getExpenses(): Promise<Expense[]> {
    return Array.from(this.expenses.values());
  }

  async getExpense(id: string): Promise<Expense | undefined> {
    return this.expenses.get(id);
  }

  async getExpensesByProperty(propertyId: string): Promise<Expense[]> {
    return Array.from(this.expenses.values()).filter(expense => expense.propertyId === propertyId);
  }

  async getExpensesByDateRange(startDate: Date, endDate: Date): Promise<Expense[]> {
    return Array.from(this.expenses.values()).filter(expense => {
      const expenseDate = new Date(expense.date);
      return expenseDate >= startDate && expenseDate <= endDate;
    });
  }

  async createExpense(expense: InsertExpense): Promise<Expense> {
    const id = randomUUID();
    const newExpense: Expense = {
      ...expense,
      receipt: expense.receipt ?? null,
      id,
      createdAt: new Date(),
    };
    this.expenses.set(id, newExpense);
    return newExpense;
  }

  async updateExpense(id: string, expense: Partial<InsertExpense>): Promise<Expense | undefined> {
    const existing = this.expenses.get(id);
    if (!existing) return undefined;
    
    const updated: Expense = { ...existing, ...expense };
    this.expenses.set(id, updated);
    return updated;
  }

  async deleteExpense(id: string): Promise<boolean> {
    return this.expenses.delete(id);
  }

  // Messages
  async getMessages(): Promise<MessageWithRelations[]> {
    const messages = Array.from(this.messages.values());
    return Promise.all(
      messages.map(async (message) => {
        const guest = message.guestId ? await this.getGuest(message.guestId) : undefined;
        const booking = message.bookingId ? await this.getBooking(message.bookingId) : undefined;
        return {
          ...message,
          guest,
          booking,
        };
      })
    );
  }

  async getMessage(id: string): Promise<MessageWithRelations | undefined> {
    const message = this.messages.get(id);
    if (!message) return undefined;
    
    const guest = message.guestId ? await this.getGuest(message.guestId) : undefined;
    const booking = message.bookingId ? await this.getBooking(message.bookingId) : undefined;
    
    return {
      ...message,
      guest,
      booking,
    };
  }

  async getMessagesByBooking(bookingId: string): Promise<MessageWithRelations[]> {
    const allMessages = await this.getMessages();
    return allMessages.filter(message => message.bookingId === bookingId);
  }

  async getMessagesByGuest(guestId: string): Promise<MessageWithRelations[]> {
    const allMessages = await this.getMessages();
    return allMessages.filter(message => message.guestId === guestId);
  }

  async getMessagesByChannel(channel: string): Promise<MessageWithRelations[]> {
    const allMessages = await this.getMessages();
    return allMessages.filter(message => message.channel === channel);
  }

  async getWhatsAppMessages(phoneNumber?: string): Promise<MessageWithRelations[]> {
    const whatsappMessages = await this.getMessagesByChannel("whatsapp");
    if (!phoneNumber) return whatsappMessages;
    
    return whatsappMessages.filter(message => 
      message.fromNumber === phoneNumber || message.toNumber === phoneNumber
    );
  }

  async createMessage(message: InsertMessage): Promise<Message> {
    const id = randomUUID();
    const newMessage: Message = {
      ...message,
      guestId: message.guestId ?? null,
      bookingId: message.bookingId ?? null,
      subject: message.subject ?? null,
      type: message.type ?? "general",
      channel: message.channel ?? "internal",
      direction: message.direction ?? "outgoing",
      whatsappMessageId: message.whatsappMessageId ?? null,
      whatsappStatus: message.whatsappStatus ?? null,
      fromNumber: message.fromNumber ?? null,
      toNumber: message.toNumber ?? null,
      isRead: message.isRead ?? false,
      id,
      sentAt: new Date(),
    };
    this.messages.set(id, newMessage);
    return newMessage;
  }

  async updateMessage(id: string, message: Partial<InsertMessage>): Promise<Message | undefined> {
    const existing = this.messages.get(id);
    if (!existing) return undefined;
    
    const updated: Message = { ...existing, ...message };
    this.messages.set(id, updated);
    return updated;
  }

  async updateWhatsAppMessageStatus(whatsappMessageId: string, status: string): Promise<Message | undefined> {
    const messages = Array.from(this.messages.values());
    const message = messages.find(m => m.whatsappMessageId === whatsappMessageId);
    
    if (!message) return undefined;
    
    const updated: Message = { ...message, whatsappStatus: status };
    this.messages.set(message.id, updated);
    return updated;
  }

  async deleteMessage(id: string): Promise<boolean> {
    return this.messages.delete(id);
  }
}

export const storage = new MemStorage();
