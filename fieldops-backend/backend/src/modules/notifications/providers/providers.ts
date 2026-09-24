import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';

export interface PushMessage {
  tokens: string[];
  title: string;
  body: string;
  data?: Record<string, unknown>;
}

/**
 * Push : Expo Push Service (compatible FCM/APNs via Expo) ou log (dev).
 * Pour FCM/APNs natif, implémenter l'envoi dans `sendNative`.
 */
@Injectable()
export class PushProvider {
  private readonly logger = new Logger('PushProvider');
  constructor(private readonly cfg: ConfigService) {}

  async send(msg: PushMessage): Promise<{ invalidTokens: string[] }> {
    if (msg.tokens.length === 0) return { invalidTokens: [] };
    const mode = this.cfg.get('notifications.push');
    if (mode !== 'expo') {
      this.logger.log(`[push:log] → ${msg.tokens.length} appareil(s) : ${msg.title} — ${msg.body}`);
      return { invalidTokens: [] };
    }
    const res = await fetch('https://exp.host/--/api/v2/push/send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify(
        msg.tokens.map((to) => ({ to, title: msg.title, body: msg.body, data: msg.data, sound: 'default', priority: 'high' })),
      ),
    });
    if (!res.ok) throw new Error(`Expo push HTTP ${res.status}`);
    const json: any = await res.json();
    const invalidTokens: string[] = [];
    (json.data ?? []).forEach((ticket: any, i: number) => {
      if (ticket.status === 'error' && ticket.details?.error === 'DeviceNotRegistered') invalidTokens.push(msg.tokens[i]);
    });
    return { invalidTokens };
  }
}

@Injectable()
export class EmailProvider {
  private readonly logger = new Logger('EmailProvider');
  private transporter?: nodemailer.Transporter;

  constructor(private readonly cfg: ConfigService) {
    if (cfg.get('notifications.email') === 'smtp') {
      const smtp = cfg.get('notifications.smtp');
      this.transporter = nodemailer.createTransport({
        host: smtp.host,
        port: smtp.port,
        secure: smtp.port === 465,
        auth: smtp.user ? { user: smtp.user, pass: smtp.password } : undefined,
      });
    }
  }

  async send(to: string, subject: string, text: string) {
    if (!this.transporter) {
      this.logger.log(`[email:log] → ${to} : ${subject} — ${text}`);
      return;
    }
    await this.transporter.sendMail({ from: this.cfg.get('notifications.smtp.from'), to, subject, text });
  }
}

/** SMS : brancher ici le fournisseur retenu (Twilio, OVH SMS, Brevo…) — §25. */
@Injectable()
export class SmsProvider {
  private readonly logger = new Logger('SmsProvider');
  constructor(private readonly cfg: ConfigService) {}

  async send(to: string, text: string) {
    const mode = this.cfg.get('notifications.sms');
    if (mode === 'log' || !mode) {
      this.logger.log(`[sms:log] → ${to} : ${text}`);
      return;
    }
    throw new Error(`Fournisseur SMS "${mode}" non implémenté`);
  }
}
