# RentManager - Property Management Application

## Overview

RentManager is a comprehensive property management application designed for rental property owners and managers. The application provides tools to manage properties, bookings, guests, maintenance tasks, expenses, and communications. It features a modern React frontend with TypeScript, backed by an Express.js API server and PostgreSQL database using Drizzle ORM.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture
- **Framework**: React 18 with TypeScript using Vite as the build tool
- **UI Library**: Shadcn/ui components built on Radix UI primitives
- **Styling**: Tailwind CSS with custom CSS variables for theming
- **State Management**: TanStack Query (React Query) for server state management
- **Routing**: Wouter for client-side routing
- **Form Handling**: React Hook Form with Zod validation
- **Component Structure**: Page-based organization with reusable UI components

### Backend Architecture
- **Framework**: Express.js with TypeScript
- **Database**: PostgreSQL with Drizzle ORM for type-safe database operations
- **API Design**: RESTful API with CRUD operations for all entities
- **Storage Layer**: Abstracted storage interface for database operations
- **Error Handling**: Centralized error handling with custom error responses
- **Request Logging**: Custom middleware for API request logging

### Database Schema
The application uses five main entities:
- **Properties**: Rental property information including name, address, amenities, and pricing
- **Guests**: Guest contact information and booking history
- **Bookings**: Reservation details linking properties and guests with dates and status
- **Maintenance Tasks**: Property maintenance scheduling and tracking
- **Expenses**: Financial tracking for property-related costs
- **Messages**: Communication management for guest correspondence

### Component Organization
- **Layout Components**: Main layout with sidebar navigation and top bar
- **Page Components**: Individual pages for each major feature area
- **UI Components**: Reusable Shadcn/ui components for consistent design
- **Modal Components**: Dialog-based forms for data entry and editing

### Development Tools
- **Build System**: Vite with React plugin and TypeScript support
- **Database Migrations**: Drizzle Kit for schema management
- **Code Quality**: TypeScript for type safety and ESLint configuration
- **Development Experience**: Hot module replacement and error overlay

## External Dependencies

### Database and ORM
- **PostgreSQL**: Primary database using Neon serverless PostgreSQL
- **Drizzle ORM**: Type-safe database operations with schema generation
- **Drizzle Kit**: Database migration and schema management tools

### UI and Styling
- **Radix UI**: Accessible component primitives for complex UI components
- **Tailwind CSS**: Utility-first CSS framework for styling
- **Lucide Icons**: Icon library for consistent iconography
- **Shadcn/ui**: Pre-built component library built on Radix UI

### State and Data Management
- **TanStack Query**: Server state management with caching and synchronization
- **React Hook Form**: Form state management and validation
- **Zod**: Schema validation for forms and API data

### Development and Build Tools
- **Vite**: Fast build tool and development server
- **TypeScript**: Static type checking and enhanced developer experience
- **ESBuild**: Fast JavaScript bundler for production builds

### Replit Integration
- **Replit Vite Plugins**: Development error overlay and cartographer for Replit environment
- **Replit Development Banner**: Environment-specific development indicators