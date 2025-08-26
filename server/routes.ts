import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { 
  insertPropertySchema, insertGuestSchema, insertBookingSchema,
  insertMaintenanceTaskSchema, insertExpenseSchema, insertMessageSchema
} from "@shared/schema";

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

  const httpServer = createServer(app);
  return httpServer;
}
