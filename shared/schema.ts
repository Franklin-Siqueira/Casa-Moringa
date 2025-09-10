import { sql } from "drizzle-orm";
import { pgTable, text, varchar, decimal, integer, timestamp, boolean } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const properties = pgTable("properties", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  description: text("description"),
  address: text("address").notNull(),
  maxGuests: integer("max_guests").notNull().default(1),
  dailyRate: decimal("daily_rate", { precision: 10, scale: 2 }).notNull(),
  amenities: text("amenities").array(),
  photos: text("photos").array(),
  createdAt: timestamp("created_at").defaultNow(),
});

export const guests = pgTable("guests", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  phone: text("phone").notNull(),
  document: text("document"),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const bookings = pgTable("bookings", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  propertyId: varchar("property_id").notNull().references(() => properties.id),
  guestId: varchar("guest_id").notNull().references(() => guests.id),
  checkIn: timestamp("check_in").notNull(),
  checkOut: timestamp("check_out").notNull(),
  numberOfGuests: integer("number_of_guests").notNull(),
  totalAmount: decimal("total_amount", { precision: 10, scale: 2 }).notNull(),
  status: text("status").notNull().default("pending"), // pending, confirmed, cancelled, completed
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const maintenanceTasks = pgTable("maintenance_tasks", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  propertyId: varchar("property_id").notNull().references(() => properties.id),
  title: text("title").notNull(),
  description: text("description"),
  type: text("type").notNull(), // cleaning, repair, maintenance, inspection
  status: text("status").notNull().default("pending"), // pending, in_progress, completed, cancelled
  scheduledDate: timestamp("scheduled_date"),
  completedDate: timestamp("completed_date"),
  assignedTo: text("assigned_to"),
  cost: decimal("cost", { precision: 10, scale: 2 }),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const expenses = pgTable("expenses", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  propertyId: varchar("property_id").notNull().references(() => properties.id),
  category: text("category").notNull(), // maintenance, utilities, supplies, insurance, taxes, other
  description: text("description").notNull(),
  amount: decimal("amount", { precision: 10, scale: 2 }).notNull(),
  date: timestamp("date").notNull(),
  receipt: text("receipt"), // file path or URL
  createdAt: timestamp("created_at").defaultNow(),
});

export const messages = pgTable("messages", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  bookingId: varchar("booking_id").references(() => bookings.id),
  guestId: varchar("guest_id").references(() => guests.id),
  subject: text("subject"),
  content: text("content").notNull(),
  type: text("type").notNull().default("general"), // general, check_in_instructions, reminder, complaint
  channel: text("channel").notNull().default("internal"), // internal, whatsapp, email, sms
  direction: text("direction").notNull().default("outgoing"), // incoming, outgoing
  whatsappMessageId: text("whatsapp_message_id"), // WhatsApp message ID for tracking
  whatsappStatus: text("whatsapp_status"), // sent, delivered, read, failed
  fromNumber: text("from_number"), // For incoming WhatsApp messages
  toNumber: text("to_number"), // For outgoing WhatsApp messages
  isRead: boolean("is_read").notNull().default(false),
  sentAt: timestamp("sent_at").defaultNow(),
});

// Insert schemas
export const insertPropertySchema = createInsertSchema(properties).omit({
  id: true,
  createdAt: true,
});

export const insertGuestSchema = createInsertSchema(guests).omit({
  id: true,
  createdAt: true,
});

export const insertBookingSchema = createInsertSchema(bookings).omit({
  id: true,
  createdAt: true,
});

export const insertMaintenanceTaskSchema = createInsertSchema(maintenanceTasks).omit({
  id: true,
  createdAt: true,
});

export const insertExpenseSchema = createInsertSchema(expenses).omit({
  id: true,
  createdAt: true,
});

export const insertMessageSchema = createInsertSchema(messages).omit({
  id: true,
  sentAt: true,
});

// Types
export type Property = typeof properties.$inferSelect;
export type InsertProperty = z.infer<typeof insertPropertySchema>;
export type Guest = typeof guests.$inferSelect;
export type InsertGuest = z.infer<typeof insertGuestSchema>;
export type Booking = typeof bookings.$inferSelect;
export type InsertBooking = z.infer<typeof insertBookingSchema>;
export type MaintenanceTask = typeof maintenanceTasks.$inferSelect;
export type InsertMaintenanceTask = z.infer<typeof insertMaintenanceTaskSchema>;
export type Expense = typeof expenses.$inferSelect;
export type InsertExpense = z.infer<typeof insertExpenseSchema>;
export type Message = typeof messages.$inferSelect;
export type InsertMessage = z.infer<typeof insertMessageSchema>;

// Extended types with relations
export type BookingWithGuest = Booking & {
  guest: Guest;
  property: Property;
};

export type MaintenanceTaskWithProperty = MaintenanceTask & {
  property: Property;
};

export type ExpenseWithProperty = Expense & {
  property: Property;
};

export type MessageWithRelations = Message & {
  guest?: Guest;
  booking?: Booking;
};
