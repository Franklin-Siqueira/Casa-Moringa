import axios from 'axios';
import { storage } from './storage';
import type { InsertMessage } from '@shared/schema';

export interface WhatsAppConfig {
  accessToken: string;
  phoneNumberId: string;
  verifyToken: string;
  webhookUrl?: string;
}

export class WhatsAppService {
  private config: WhatsAppConfig | null = null;
  private readonly apiVersion = 'v18.0';
  private readonly baseUrl = 'https://graph.facebook.com';

  setConfig(config: WhatsAppConfig) {
    this.config = config;
  }

  isConfigured(): boolean {
    return this.config !== null && 
           !!this.config.accessToken && 
           !!this.config.phoneNumberId;
  }

  async sendTextMessage(to: string, message: string, guestId?: string, bookingId?: string): Promise<any> {
    if (!this.isConfigured()) {
      throw new Error('WhatsApp service not configured');
    }

    const url = `${this.baseUrl}/${this.apiVersion}/${this.config!.phoneNumberId}/messages`;
    
    const data = {
      messaging_product: 'whatsapp',
      to: to,
      type: 'text',
      text: { body: message }
    };

    try {
      const response = await axios.post(url, data, {
        headers: {
          'Authorization': `Bearer ${this.config!.accessToken}`,
          'Content-Type': 'application/json'
        }
      });

      // Salvar mensagem no banco de dados
      const messageData: InsertMessage = {
        content: message,
        type: 'general',
        channel: 'whatsapp',
        direction: 'outgoing',
        toNumber: to,
        fromNumber: this.config!.phoneNumberId,
        whatsappMessageId: response.data.messages[0].id,
        whatsappStatus: 'sent',
        guestId: guestId || null,
        bookingId: bookingId || null,
        isRead: false
      };

      await storage.createMessage(messageData);

      return response.data;
    } catch (error: any) {
      console.error('Error sending WhatsApp message:', error.message || 'Unknown error');
      throw new Error(error.response?.data?.error?.message || error.message || 'Failed to send WhatsApp message');
    }
  }

  async sendTemplateMessage(to: string, templateName: string, languageCode: string = 'pt_BR', parameters?: string[], guestId?: string, bookingId?: string): Promise<any> {
    if (!this.isConfigured()) {
      throw new Error('WhatsApp service not configured');
    }

    const url = `${this.baseUrl}/${this.apiVersion}/${this.config!.phoneNumberId}/messages`;
    
    const template: any = {
      name: templateName,
      language: { code: languageCode }
    };

    if (parameters && parameters.length > 0) {
      template.components = [
        {
          type: 'body',
          parameters: parameters.map(param => ({ type: 'text', text: param }))
        }
      ];
    }

    const data = {
      messaging_product: 'whatsapp',
      to: to,
      type: 'template',
      template: template
    };

    try {
      const response = await axios.post(url, data, {
        headers: {
          'Authorization': `Bearer ${this.config!.accessToken}`,
          'Content-Type': 'application/json'
        }
      });

      // Salvar mensagem no banco de dados
      const messageData: InsertMessage = {
        content: `Template: ${templateName}`,
        type: 'general',
        channel: 'whatsapp',
        direction: 'outgoing',
        toNumber: to,
        fromNumber: this.config!.phoneNumberId,
        whatsappMessageId: response.data.messages[0].id,
        whatsappStatus: 'sent',
        guestId: guestId || null,
        bookingId: bookingId || null,
        isRead: false
      };

      await storage.createMessage(messageData);

      return response.data;
    } catch (error: any) {
      console.error('Error sending WhatsApp template:', error.message || 'Unknown error');
      throw new Error(error.response?.data?.error?.message || error.message || 'Failed to send WhatsApp template');
    }
  }

  async processIncomingMessage(messageData: any): Promise<void> {
    try {
      if (!messageData.messages || messageData.messages.length === 0) {
        console.log('No messages in webhook data');
        return;
      }

      const message = messageData.messages[0];
      const contact = messageData.contacts?.[0];
      
      if (!contact) {
        console.log('No contact information in webhook data');
        return;
      }
      
      // Normalizar número de telefone para E.164
      const normalizedPhone = this.normalizePhoneNumber(contact.wa_id);
      
      // Procurar hóspede pelo telefone
      const guests = await storage.getGuests();
      const guest = guests.find(g => this.normalizePhoneNumber(g.phone) === normalizedPhone);

      const messageContent = message.text ? message.text.body : 
                           message.image ? '[Imagem]' :
                           message.document ? '[Documento]' :
                           message.audio ? '[Áudio]' :
                           '[Mensagem não suportada]';

      const insertMessage: InsertMessage = {
        content: messageContent,
        type: 'general',
        channel: 'whatsapp',
        direction: 'incoming',
        fromNumber: contact.wa_id,
        toNumber: this.config?.phoneNumberId || '',
        whatsappMessageId: message.id,
        whatsappStatus: 'received',
        guestId: guest?.id || null,
        bookingId: null, // Será associado posteriormente se necessário
        isRead: false
      };

      await storage.createMessage(insertMessage);
      
      console.log('WhatsApp message processed:', message.id);
    } catch (error) {
      console.error('Error processing incoming WhatsApp message:', error instanceof Error ? error.message : 'Unknown error');
    }
  }

  async processStatusUpdate(statusData: any): Promise<void> {
    try {
      if (!statusData.statuses || statusData.statuses.length === 0) {
        console.log('No status updates in webhook data');
        return;
      }
      
      const status = statusData.statuses[0];
      const existingMessage = await storage.updateWhatsAppMessageStatus(status.id, status.status);
      
      if (existingMessage) {
        console.log('WhatsApp status updated:', status.id, status.status);
      } else {
        console.log('Message not found for status update:', status.id);
      }
    } catch (error) {
      console.error('Error processing WhatsApp status update:', error instanceof Error ? error.message : 'Unknown error');
    }
  }

  verifyWebhook(mode: string, token: string, challenge: string): string | null {
    if (!this.config) return null;
    
    if (mode === 'subscribe' && token === this.config.verifyToken) {
      return challenge;
    }
    return null;
  }

  private normalizePhoneNumber(phone: string): string {
    // Remove todos os caracteres não numéricos
    const cleaned = phone.replace(/\D/g, '');
    
    // Se não começar com código do país, assumir Brasil (+55)
    if (cleaned.length === 11 && cleaned.startsWith('11')) {
      return `55${cleaned}`;
    } else if (cleaned.length === 10) {
      return `5511${cleaned}`;
    } else if (cleaned.length === 13 && cleaned.startsWith('55')) {
      return cleaned;
    }
    
    return cleaned;
  }

  async getBusinessProfile(): Promise<any> {
    if (!this.isConfigured()) {
      throw new Error('WhatsApp service not configured');
    }

    const url = `${this.baseUrl}/${this.apiVersion}/${this.config!.phoneNumberId}?fields=name,status,messaging_product`;
    
    try {
      const response = await axios.get(url, {
        headers: {
          'Authorization': `Bearer ${this.config!.accessToken}`
        }
      });

      return response.data;
    } catch (error: any) {
      console.error('Error getting business profile:', error.message || 'Unknown error');
      throw new Error(error.response?.data?.error?.message || error.message || 'Failed to get business profile');
    }
  }
}

export const whatsappService = new WhatsAppService();