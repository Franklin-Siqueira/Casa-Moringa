import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { whatsappService } from "./whatsapp-service";
import { 
  insertPropertySchema, insertGuestSchema, insertBookingSchema,
  insertMaintenanceTaskSchema, insertExpenseSchema, insertMessageSchema
} from "@shared/schema";
import { z } from "zod";

// WhatsApp validation schemas
const whatsappConfigSchema = z.object({
  accessToken: z.string().min(1, "Access token é obrigatório"),
  phoneNumberId: z.string().min(1, "Phone Number ID é obrigatório"),
  verifyToken: z.string().min(1, "Verify token é obrigatório"),
  webhookUrl: z.string().url().optional(),
});

const whatsappSendSchema = z.object({
  to: z.string().min(1, "Número destinatário é obrigatório"),
  message: z.string().min(1, "Mensagem é obrigatória"),
  guestId: z.string().optional(),
  bookingId: z.string().optional(),
});

const whatsappTemplateSchema = z.object({
  to: z.string().min(1, "Número destinatário é obrigatório"),
  templateName: z.string().min(1, "Nome do template é obrigatório"),
  languageCode: z.string().optional(),
  parameters: z.array(z.string()).optional(),
  guestId: z.string().optional(),
  bookingId: z.string().optional(),
});

export async function registerRoutes(app: Express): Promise<Server> {
  
  // Properties routes
  app.get("/api/properties", async (req, res) => {
    try {
      const properties = await storage.getProperties();
      res.json(properties);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch properties" });
    }
  });

  app.get("/api/properties/:id", async (req, res) => {
    try {
      const property = await storage.getProperty(req.params.id);
      if (!property) {
        return res.status(404).json({ message: "Property not found" });
      }
      res.json(property);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch property" });
    }
  });

  app.post("/api/properties", async (req, res) => {
    try {
      const propertyData = insertPropertySchema.parse(req.body);
      const property = await storage.createProperty(propertyData);
      res.status(201).json(property);
    } catch (error) {
      res.status(400).json({ message: "Invalid property data" });
    }
  });

  app.patch("/api/properties/:id", async (req, res) => {
    try {
      const propertyData = insertPropertySchema.partial().parse(req.body);
      const property = await storage.updateProperty(req.params.id, propertyData);
      if (!property) {
        return res.status(404).json({ message: "Property not found" });
      }
      res.json(property);
    } catch (error) {
      res.status(400).json({ message: "Invalid property data" });
    }
  });

  app.delete("/api/properties/:id", async (req, res) => {
    try {
      const deleted = await storage.deleteProperty(req.params.id);
      if (!deleted) {
        return res.status(404).json({ message: "Property not found" });
      }
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ message: "Failed to delete property" });
    }
  });

  // Guests routes
  app.get("/api/guests", async (req, res) => {
    try {
      const guests = await storage.getGuests();
      res.json(guests);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch guests" });
    }
  });

  app.post("/api/guests", async (req, res) => {
    try {
      const guestData = insertGuestSchema.parse(req.body);
      const guest = await storage.createGuest(guestData);
      res.status(201).json(guest);
    } catch (error) {
      res.status(400).json({ message: "Invalid guest data" });
    }
  });

  app.patch("/api/guests/:id", async (req, res) => {
    try {
      const guestData = insertGuestSchema.partial().parse(req.body);
      const guest = await storage.updateGuest(req.params.id, guestData);
      if (!guest) {
        return res.status(404).json({ message: "Guest not found" });
      }
      res.json(guest);
    } catch (error) {
      res.status(400).json({ message: "Invalid guest data" });
    }
  });

  // Bookings routes
  app.get("/api/bookings", async (req, res) => {
    try {
      const { startDate, endDate, propertyId, guestId } = req.query;
      
      let bookings;
      if (startDate && endDate) {
        bookings = await storage.getBookingsByDateRange(new Date(startDate as string), new Date(endDate as string));
      } else if (propertyId) {
        bookings = await storage.getBookingsByProperty(propertyId as string);
      } else if (guestId) {
        bookings = await storage.getBookingsByGuest(guestId as string);
      } else {
        bookings = await storage.getBookings();
      }
      
      res.json(bookings);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch bookings" });
    }
  });

  app.get("/api/bookings/:id", async (req, res) => {
    try {
      const booking = await storage.getBooking(req.params.id);
      if (!booking) {
        return res.status(404).json({ message: "Booking not found" });
      }
      res.json(booking);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch booking" });
    }
  });

  app.post("/api/bookings", async (req, res) => {
    try {
      const bookingData = insertBookingSchema.parse(req.body);
      
      // Check if guest exists, create if not
      let guest = await storage.getGuestByEmail(req.body.guestEmail);
      if (!guest && req.body.guestData) {
        guest = await storage.createGuest(req.body.guestData);
      }
      
      if (!guest) {
        return res.status(400).json({ message: "Guest information required" });
      }
      
      const booking = await storage.createBooking({ 
        ...bookingData, 
        guestId: guest.id 
      });
      res.status(201).json(booking);
    } catch (error) {
      res.status(400).json({ message: "Invalid booking data" });
    }
  });

  app.patch("/api/bookings/:id", async (req, res) => {
    try {
      const bookingData = insertBookingSchema.partial().parse(req.body);
      const booking = await storage.updateBooking(req.params.id, bookingData);
      if (!booking) {
        return res.status(404).json({ message: "Booking not found" });
      }
      res.json(booking);
    } catch (error) {
      res.status(400).json({ message: "Invalid booking data" });
    }
  });

  app.delete("/api/bookings/:id", async (req, res) => {
    try {
      const deleted = await storage.deleteBooking(req.params.id);
      if (!deleted) {
        return res.status(404).json({ message: "Booking not found" });
      }
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ message: "Failed to delete booking" });
    }
  });

  // Maintenance routes
  app.get("/api/maintenance", async (req, res) => {
    try {
      const { propertyId } = req.query;
      const tasks = propertyId 
        ? await storage.getMaintenanceTasksByProperty(propertyId as string)
        : await storage.getMaintenanceTasks();
      res.json(tasks);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch maintenance tasks" });
    }
  });

  app.post("/api/maintenance", async (req, res) => {
    try {
      const taskData = insertMaintenanceTaskSchema.parse(req.body);
      const task = await storage.createMaintenanceTask(taskData);
      res.status(201).json(task);
    } catch (error) {
      res.status(400).json({ message: "Invalid maintenance task data" });
    }
  });

  app.patch("/api/maintenance/:id", async (req, res) => {
    try {
      const taskData = insertMaintenanceTaskSchema.partial().parse(req.body);
      const task = await storage.updateMaintenanceTask(req.params.id, taskData);
      if (!task) {
        return res.status(404).json({ message: "Maintenance task not found" });
      }
      res.json(task);
    } catch (error) {
      res.status(400).json({ message: "Invalid maintenance task data" });
    }
  });

  // Expenses routes
  app.get("/api/expenses", async (req, res) => {
    try {
      const { propertyId, startDate, endDate } = req.query;
      
      let expenses;
      if (startDate && endDate) {
        expenses = await storage.getExpensesByDateRange(new Date(startDate as string), new Date(endDate as string));
      } else if (propertyId) {
        expenses = await storage.getExpensesByProperty(propertyId as string);
      } else {
        expenses = await storage.getExpenses();
      }
      
      res.json(expenses);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch expenses" });
    }
  });

  app.post("/api/expenses", async (req, res) => {
    try {
      const expenseData = insertExpenseSchema.parse(req.body);
      const expense = await storage.createExpense(expenseData);
      res.status(201).json(expense);
    } catch (error) {
      res.status(400).json({ message: "Invalid expense data" });
    }
  });

  // Messages routes
  app.get("/api/messages", async (req, res) => {
    try {
      const { bookingId, guestId } = req.query;
      
      let messages;
      if (bookingId) {
        messages = await storage.getMessagesByBooking(bookingId as string);
      } else if (guestId) {
        messages = await storage.getMessagesByGuest(guestId as string);
      } else {
        messages = await storage.getMessages();
      }
      
      res.json(messages);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch messages" });
    }
  });

  app.post("/api/messages", async (req, res) => {
    try {
      const messageData = insertMessageSchema.parse(req.body);
      const message = await storage.createMessage(messageData);
      res.status(201).json(message);
    } catch (error) {
      res.status(400).json({ message: "Invalid message data" });
    }
  });

  // Dashboard stats endpoint
  app.get("/api/dashboard/stats", async (req, res) => {
    try {
      const bookings = await storage.getBookings();
      const currentMonth = new Date();
      currentMonth.setDate(1);
      const nextMonth = new Date(currentMonth);
      nextMonth.setMonth(nextMonth.getMonth() + 1);
      
      const monthlyBookings = bookings.filter(booking => {
        const checkIn = new Date(booking.checkIn);
        return checkIn >= currentMonth && checkIn < nextMonth;
      });
      
      const confirmedBookings = monthlyBookings.filter(booking => booking.status === 'confirmed');
      const totalDays = 30; // Simplified
      const occupiedDays = confirmedBookings.reduce((acc, booking) => {
        const checkIn = new Date(booking.checkIn);
        const checkOut = new Date(booking.checkOut);
        const days = Math.ceil((checkOut.getTime() - checkIn.getTime()) / (1000 * 60 * 60 * 24));
        return acc + days;
      }, 0);
      
      const occupancyRate = Math.round((occupiedDays / totalDays) * 100);
      
      const monthlyRevenue = confirmedBookings.reduce((acc, booking) => {
        return acc + parseFloat(booking.totalAmount);
      }, 0);
      
      const activeReservations = bookings.filter(booking => 
        booking.status === 'confirmed' && new Date(booking.checkOut) >= new Date()
      ).length;
      
      res.json({
        occupancyRate,
        monthlyRevenue,
        activeReservations,
        averageRating: 4.8, // Mock value for now
        totalReviews: 127
      });
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch dashboard stats" });
    }
  });

  // WhatsApp routes
  app.get("/api/whatsapp/webhook", (req, res) => {
    const mode = req.query["hub.mode"];
    const token = req.query["hub.verify_token"];
    const challenge = req.query["hub.challenge"];

    const result = whatsappService.verifyWebhook(mode as string, token as string, challenge as string);
    
    if (result) {
      res.status(200).send(result);
    } else {
      res.sendStatus(403);
    }
  });

  app.post("/api/whatsapp/webhook", async (req, res) => {
    try {
      const body = req.body;
      
      if (body.object === 'whatsapp_business_account') {
        for (const entry of body.entry) {
          for (const change of entry.changes) {
            if (change.field === 'messages') {
              if (change.value.messages) {
                await whatsappService.processIncomingMessage(change.value);
              }
              if (change.value.statuses) {
                await whatsappService.processStatusUpdate(change.value);
              }
            }
          }
        }
      }
      
      res.status(200).send('EVENT_RECEIVED');
    } catch (error) {
      console.error('WhatsApp webhook error:', error);
      res.status(500).json({ message: "Failed to process webhook" });
    }
  });

  app.post("/api/whatsapp/config", async (req, res) => {
    try {
      const configData = whatsappConfigSchema.parse(req.body);

      whatsappService.setConfig(configData);

      res.json({ message: "WhatsApp configured successfully" });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ 
          message: "Invalid configuration data",
          errors: error.errors
        });
      }
      res.status(500).json({ message: "Failed to configure WhatsApp" });
    }
  });

  app.get("/api/whatsapp/status", async (req, res) => {
    try {
      const isConfigured = whatsappService.isConfigured();
      let profileSummary = null;
      
      if (isConfigured) {
        try {
          const profile = await whatsappService.getBusinessProfile();
          // Only return safe profile info, no sensitive data
          profileSummary = {
            name: profile.name,
            status: profile.status,
            messaging_product: profile.messaging_product
          };
        } catch (error) {
          console.error('Failed to get business profile:', error instanceof Error ? error.message : 'Unknown error');
        }
      }

      res.json({
        configured: isConfigured,
        profile: profileSummary
      });
    } catch (error) {
      res.status(500).json({ message: "Failed to get WhatsApp status" });
    }
  });

  app.post("/api/whatsapp/send", async (req, res) => {
    try {
      const sendData = whatsappSendSchema.parse(req.body);

      if (!whatsappService.isConfigured()) {
        return res.status(400).json({ message: "WhatsApp not configured" });
      }

      const result = await whatsappService.sendTextMessage(
        sendData.to, 
        sendData.message, 
        sendData.guestId, 
        sendData.bookingId
      );
      
      // Only return safe data, no sensitive tokens
      res.json({ 
        success: true,
        messageId: result.messages?.[0]?.id,
        status: 'sent'
      });
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ 
          message: "Invalid send data",
          errors: error.errors
        });
      }
      
      console.error('WhatsApp send error:', error instanceof Error ? error.message : 'Unknown error');
      res.status(500).json({ 
        message: error.message || "Failed to send WhatsApp message"
      });
    }
  });

  app.post("/api/whatsapp/send-template", async (req, res) => {
    try {
      const templateData = whatsappTemplateSchema.parse(req.body);

      if (!whatsappService.isConfigured()) {
        return res.status(400).json({ message: "WhatsApp not configured" });
      }

      const result = await whatsappService.sendTemplateMessage(
        templateData.to, 
        templateData.templateName, 
        templateData.languageCode || 'pt_BR', 
        templateData.parameters, 
        templateData.guestId, 
        templateData.bookingId
      );
      
      // Only return safe data
      res.json({ 
        success: true,
        messageId: result.messages?.[0]?.id,
        status: 'sent'
      });
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ 
          message: "Invalid template data",
          errors: error.errors
        });
      }
      
      console.error('WhatsApp template send error:', error instanceof Error ? error.message : 'Unknown error');
      res.status(500).json({ 
        message: error.message || "Failed to send WhatsApp template"
      });
    }
  });

  app.get("/api/messages/whatsapp", async (req, res) => {
    try {
      const { phoneNumber } = req.query;
      const messages = await storage.getWhatsAppMessages(phoneNumber as string);
      res.json(messages);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch WhatsApp messages" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
