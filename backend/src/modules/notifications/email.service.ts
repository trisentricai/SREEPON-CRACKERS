import { prisma } from '../../infrastructure/prisma';

/**
 * Email service for order notifications.
 *
 * Cloudflare Workers cannot open raw SMTP sockets, so e-mail is delivered over
 * an HTTP e-mail API (Resend-compatible payload: `{ from, to, subject, html,
 * text }`). Configure it either with Worker secrets:
 *
 *   EMAIL_API_URL  (default https://api.resend.com/emails)
 *   EMAIL_API_KEY  (or RESEND_API_KEY)
 *   EMAIL_FROM     (verified sender address)
 *   EMAIL_FROM_NAME (optional, defaults to "Sreepon")
 *
 * …or from the admin settings page (Settings → Notification) by putting the
 * HTTP endpoint in `smtpHost` and the API key in `smtpPass`.
 *
 * When nothing is configured every send is a quiet no-op returning `false`, so
 * order creation never fails because e-mail is offline.
 */

interface EmailConfig {
  apiUrl: string;
  apiKey: string;
  from: string;
  fromName: string;
}

function normalizeFrom(from: string, fromName: string): string {
  return fromName ? `"${fromName}" <${from}>` : from;
}

async function getEmailConfig(): Promise<EmailConfig | null> {
  const envUrl = process.env.EMAIL_API_URL;
  const envKey = process.env.EMAIL_API_KEY || process.env.RESEND_API_KEY;
  const envFrom = process.env.EMAIL_FROM;

  if (envKey && envFrom) {
    return {
      apiUrl: envUrl || 'https://api.resend.com/emails',
      apiKey: envKey,
      from: envFrom,
      fromName: process.env.EMAIL_FROM_NAME || 'Sreepon',
    };
  }

  const setting = await prisma.siteSetting.findUnique({ where: { key: 'settings.notification' } });
  const notification = (setting?.value ?? {}) as Record<string, unknown>;

  const url = typeof notification.smtpHost === 'string' ? notification.smtpHost.trim() : '';
  const key = typeof notification.smtpPass === 'string' ? notification.smtpPass.trim() : '';
  const from = typeof notification.smtpFrom === 'string' ? notification.smtpFrom.trim() : '';

  if (!url || !key || !from) return null;
  if (!url.startsWith('http://') && !url.startsWith('https://')) {
    console.warn('[Email] SMTP hosts are not reachable from Cloudflare Workers. Use an HTTP e-mail API URL instead.');
    return null;
  }

  return {
    apiUrl: url,
    apiKey: key,
    from,
    fromName: typeof notification.smtpFromName === 'string' ? notification.smtpFromName : 'Sreepon',
  };
}

/** E-mails are disabled unless an admin explicitly turns them on. */
async function emailEnabled(): Promise<boolean> {
  if (process.env.EMAIL_API_KEY || process.env.RESEND_API_KEY) return true;
  const setting = await prisma.siteSetting.findUnique({ where: { key: 'settings.notification' } });
  const notification = (setting?.value ?? {}) as Record<string, unknown>;
  return notification.emailNotificationsEnabled === true;
}

export interface EmailOptions {
  to: string;
  subject: string;
  html: string;
  text?: string;
}

export async function sendEmail(options: EmailOptions): Promise<boolean> {
  try {
    if (!(await emailEnabled())) {
      return false;
    }

    const config = await getEmailConfig();
    if (!config) {
      console.warn('[Email] No HTTP e-mail API configured; skipping:', options.subject);
      return false;
    }

    const response = await fetch(config.apiUrl, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${config.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: normalizeFrom(config.from, config.fromName),
        to: [options.to],
        subject: options.subject,
        html: options.html,
        text: options.text,
      }),
      signal: AbortSignal.timeout(10000),
    });

    if (!response.ok) {
      const detail = await response.text().catch(() => '');
      console.error('[Email] Provider rejected message:', response.status, detail.slice(0, 500));
      return false;
    }

    return true;
  } catch (err) {
    console.error('[Email] Failed to send email:', err);
    return false;
  }
}

/**
 * Email templates for order notifications
 */

export function orderConfirmationEmail(
  orderNumber: string,
  customerName: string,
  grandTotal: string,
  currency: string,
  items: Array<{ name: string; quantity: number; lineTotal: string }>,
): { subject: string; html: string; text: string } {
  const itemsHtml = items
    .map(
      (item) => `
      <tr>
        <td style="padding: 8px; border-bottom: 1px solid #e2e8f0;">${item.name}</td>
        <td style="padding: 8px; border-bottom: 1px solid #e2e8f0; text-align: center;">${item.quantity}</td>
        <td style="padding: 8px; border-bottom: 1px solid #e2e8f0; text-align: right;">${item.lineTotal}</td>
      </tr>
    `,
    )
    .join('');

  return {
    subject: `Order Confirmation - ${orderNumber}`,
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Order Confirmation</title>
      </head>
      <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background: linear-gradient(135deg, #ff8a3d 0%, #4338ca 100%); padding: 30px; text-align: center; border-radius: 8px 8px 0 0;">
          <h1 style="color: white; margin: 0; font-size: 28px;">Order Confirmed</h1>
        </div>
        <div style="background: #f8fafc; padding: 25px; border: 1px solid #e2e8f0; border-top: none; border-radius: 0 0 8px 8px;">
          <h2 style="color: #1e293b; margin-top: 0;">Order #${orderNumber}</h2>
          <p>Hi ${customerName},</p>
          <p>Thank you for your order with Sreepon! We've received your order and it's being processed.</p>

          <table style="width: 100%; border-collapse: collapse; margin: 20px 0;">
            <thead>
              <tr style="background: #f1f5f9;">
                <th style="padding: 12px; text-align: left; border-bottom: 2px solid #e2e8f0;">Item</th>
                <th style="padding: 12px; text-align: center; border-bottom: 2px solid #e2e8f0;">Qty</th>
                <th style="padding: 12px; text-align: right; border-bottom: 2px solid #e2e8f0;">Total</th>
              </tr>
            </thead>
            <tbody>
              ${itemsHtml}
            </tbody>
          </table>

          <div style="text-align: right; font-size: 18px; font-weight: bold; color: #ff8a3d; margin-top: 15px;">
            Total: ${currency} ${grandTotal}
          </div>

          <div style="margin-top: 25px; padding: 15px; background: #f8fafc; border-radius: 6px; border-left: 4px solid #4338ca;">
            <p style="margin: 0; font-size: 14px; color: #475569;">
              <strong>Order Number:</strong> ${orderNumber}<br>
              <strong>Status:</strong> Order Confirmed<br>
              <strong>Ordered on:</strong> ${new Date().toLocaleDateString()}
            </p>
          </div>

          <p style="margin-top: 25px; color: #64748b; font-size: 14px;">
            You can track your order status anytime from your account dashboard. If you have any questions,
            please contact our support team.
          </p>

          <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 25px 0;">
          <p style="font-size: 12px; color: #94a3b8; text-align: center;">
            Sreepon • Premium Green Crackers &amp; Gift Boxes<br>
            © 2026 Sreepon. All rights reserved.
          </p>
        </div>
      </body>
      </html>
    `,
    text: `Order Confirmation - ${orderNumber}\n\nHi ${customerName},\n\nThank you for your order with Sreepon! We've received your order and it's being processed.\n\nOrder #${orderNumber}\nTotal: ${currency} ${grandTotal}\n\n${items.map((i) => `${i.name} x${i.quantity} - ${i.lineTotal}`).join('\n')}\n\nYou can track your order status anytime from your account dashboard.\n\nSreepon • Premium Green Crackers & Gift Boxes`,
  };
}

export function orderStatusEmail(
  orderNumber: string,
  customerName: string,
  status: string,
  grandTotal: string,
  currency: string,
): { subject: string; html: string; text: string } {
  const statusLabels: Record<string, string> = {
    PENDING: 'Order Received',
    CONFIRMED: 'Order Confirmed',
    PROCESSING: 'Order Processing',
    PACKED: 'Order Packed',
    SHIPPED: 'Order Shipped',
    OUT_FOR_DELIVERY: 'Out for Delivery',
    DELIVERED: 'Order Delivered',
    CANCELLED: 'Order Cancelled',
    REFUNDED: 'Order Refunded',
  };

  const label = statusLabels[status] || status;

  const statusColors: Record<string, string> = {
    PENDING: '#f59e0b',
    CONFIRMED: '#4338ca',
    PROCESSING: '#3b82f6',
    PACKED: '#3b82f6',
    SHIPPED: '#3b82f6',
    OUT_FOR_DELIVERY: '#f59e0b',
    DELIVERED: '#22c55e',
    CANCELLED: '#ef4444',
    REFUNDED: '#ef4444',
  };

  const color = statusColors[status] || '#4338ca';

  return {
    subject: `Order Update: ${label} - ${orderNumber}`,
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Order Update</title>
      </head>
      <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background: linear-gradient(135deg, ${color} 0%, #4338ca 100%); padding: 30px; text-align: center; border-radius: 8px 8px 0 0;">
          <h1 style="color: white; margin: 0; font-size: 28px;">Order Status Update</h1>
        </div>
        <div style="background: #f8fafc; padding: 25px; border: 1px solid #e2e8f0; border-top: none; border-radius: 0 0 8px 8px;">
          <h2 style="color: #1e293b; margin-top: 0;">Order #${orderNumber}</h2>
          <p>Hi ${customerName},</p>
          <p>Your order status has been updated to:</p>

          <div style="text-align: center; margin: 25px 0;">
            <span style="display: inline-block; background: ${color}; color: white; padding: 10px 24px; border-radius: 8px; font-size: 18px; font-weight: bold; text-transform: uppercase;">
              ${label}
            </span>
          </div>

          <div style="margin-top: 25px; padding: 15px; background: #f8fafc; border-radius: 6px; border-left: 4px solid ${color};">
            <p style="margin: 0; font-size: 14px; color: #475569;">
              <strong>Order Number:</strong> ${orderNumber}<br>
              <strong>Status:</strong> ${label}<br>
              <strong>Order Total:</strong> ${currency} ${grandTotal}<br>
              <strong>Updated on:</strong> ${new Date().toLocaleDateString()}
            </p>
          </div>

          <p style="margin-top: 25px; color: #64748b; font-size: 14px;">
            You can track your order status anytime from your account dashboard.
          </p>

          <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 25px 0;">
          <p style="font-size: 12px; color: #94a3b8; text-align: center;">
            Sreepon • Premium Green Crackers &amp; Gift Boxes<br>
            © 2026 Sreepon. All rights reserved.
          </p>
        </div>
      </body>
      </html>
    `,
    text: `Order Status Update - ${orderNumber}\n\nHi ${customerName},\n\nYour order status has been updated to: ${label}\n\nOrder #${orderNumber}\nStatus: ${label}\nOrder Total: ${currency} ${grandTotal}\nUpdated on: ${new Date().toLocaleDateString()}\n\nYou can track your order status anytime from your account dashboard.\n\nSreepon • Premium Green Crackers & Gift Boxes`,
  };
}
