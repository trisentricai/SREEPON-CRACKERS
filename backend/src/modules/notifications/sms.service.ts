import { prisma } from '../../infrastructure/prisma';

/**
 * SMS service for order notifications.
 *
 * Delivery goes through an HTTP provider so it works on Cloudflare Workers:
 *   - Twilio (TWILIO_ACCOUNT_SID / TWILIO_AUTH_TOKEN / TWILIO_FROM_NUMBER)
 *   - MSG91  (MSG91_AUTH_KEY / MSG91_SENDER_ID)
 *   - generic HTTP endpoint (SMS_API_URL / SMS_API_KEY / SMS_FROM)
 *
 * Each of these can also be configured from the admin settings page under
 * Settings → Notification. When nothing is configured the call is a quiet
 * no-op returning `false` so an order never fails because SMS is offline.
 */

interface SmsOptions {
  to: string;
  message: string;
}

interface SmsConfig {
  twilio?: { sid: string; token: string; from: string };
  msg91?: { key: string; sender: string };
  generic?: { url: string; key: string; from?: string };
}

function toE164(phone: string): string {
  const digits = phone.replace(/\D/g, '');
  if (digits.length === 10) return `+91${digits}`;
  if (digits.startsWith('91') && digits.length === 12) return `+${digits}`;
  return phone.startsWith('+') ? phone : `+${digits}`;
}

async function getSmsConfig(): Promise<SmsConfig> {
  const config: SmsConfig = {};

  const envSid = process.env.TWILIO_ACCOUNT_SID;
  const envToken = process.env.TWILIO_AUTH_TOKEN;
  const envFrom = process.env.TWILIO_FROM_NUMBER;
  const envMsg91Key = process.env.MSG91_AUTH_KEY;
  const envMsg91Sender = process.env.MSG91_SENDER_ID;
  const envSmsUrl = process.env.SMS_API_URL;
  const envSmsKey = process.env.SMS_API_KEY;

  if (envSid && envToken && envFrom) {
    config.twilio = { sid: envSid, token: envToken, from: envFrom };
  }
  if (envMsg91Key && envMsg91Sender) {
    config.msg91 = { key: envMsg91Key, sender: envMsg91Sender };
  }
  if (envSmsUrl && envSmsKey) {
    config.generic = { url: envSmsUrl, key: envSmsKey, from: process.env.SMS_FROM };
  }
  if (config.twilio || config.msg91 || config.generic) return config;

  const setting = await prisma.siteSetting.findUnique({ where: { key: 'settings.notification' } });
  const notification = (setting?.value ?? {}) as Record<string, unknown>;
  const str = (value: unknown): string => (typeof value === 'string' ? value.trim() : '');

  const sid = str(notification.twilioAccountSid);
  const token = str(notification.twilioAuthToken);
  const from = str(notification.twilioFromNumber);
  if (sid && token && from) config.twilio = { sid, token, from };

  const msgKey = str(notification.msg91AuthKey);
  const msgSender = str(notification.msg91SenderId);
  if (msgKey && msgSender) config.msg91 = { key: msgKey, sender: msgSender };

  const url = str(notification.smsApiUrl);
  const key = str(notification.smsApiKey);
  if (url && key) config.generic = { url, key, from: str(notification.smsFrom) || undefined };

  return config;
}

async function smsEnabled(): Promise<boolean> {
  if (
    process.env.TWILIO_ACCOUNT_SID ||
    process.env.MSG91_AUTH_KEY ||
    process.env.SMS_API_URL
  ) {
    return true;
  }
  const setting = await prisma.siteSetting.findUnique({ where: { key: 'settings.notification' } });
  const notification = (setting?.value ?? {}) as Record<string, unknown>;
  return notification.smsNotificationsEnabled === true;
}

async function sendViaTwilio(
  config: NonNullable<SmsConfig['twilio']>,
  options: SmsOptions,
): Promise<boolean> {
  const body = new URLSearchParams({
    To: toE164(options.to),
    From: config.from,
    Body: options.message,
  });

  const response = await fetch(
    `https://api.twilio.com/2010-04-01/Accounts/${config.sid}/Messages.json`,
    {
      method: 'POST',
      headers: {
        Authorization: `Basic ${btoa(`${config.sid}:${config.token}`)}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: body.toString(),
      signal: AbortSignal.timeout(10000),
    },
  );

  if (!response.ok) {
    const detail = await response.text().catch(() => '');
    console.error('[SMS] Twilio rejected message:', response.status, detail.slice(0, 500));
    return false;
  }
  return true;
}

async function sendViaMsg91(
  config: NonNullable<SmsConfig['msg91']>,
  options: SmsOptions,
): Promise<boolean> {
  const mobile = toE164(options.to).replace('+', '');
  const params = new URLSearchParams({
    authkey: config.key,
    mobiles: mobile,
    message: options.message,
    sender: config.sender,
    route: '4',
    country: '91',
  });

  const response = await fetch(`https://api.msg91.com/api/sendhttp.php?${params.toString()}`, {
    method: 'GET',
    signal: AbortSignal.timeout(10000),
  });

  if (!response.ok) {
    const detail = await response.text().catch(() => '');
    console.error('[SMS] MSG91 rejected message:', response.status, detail.slice(0, 500));
    return false;
  }
  return true;
}

async function sendViaGeneric(
  config: NonNullable<SmsConfig['generic']>,
  options: SmsOptions,
): Promise<boolean> {
  const response = await fetch(config.url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${config.key}`,
      'x-api-key': config.key,
    },
    body: JSON.stringify({ to: toE164(options.to), message: options.message, from: config.from }),
    signal: AbortSignal.timeout(10000),
  });

  if (!response.ok) {
    const detail = await response.text().catch(() => '');
    console.error('[SMS] Provider rejected message:', response.status, detail.slice(0, 500));
    return false;
  }
  return true;
}

export async function sendSms(options: SmsOptions): Promise<boolean> {
  try {
    if (!(await smsEnabled())) {
      return false;
    }

    const config = await getSmsConfig();
    if (config.twilio) return await sendViaTwilio(config.twilio, options);
    if (config.msg91) return await sendViaMsg91(config.msg91, options);
    if (config.generic) return await sendViaGeneric(config.generic, options);

    console.warn('[SMS] No SMS provider configured; skipping:', options.to);
    return false;
  } catch (err) {
    console.error('[SMS] Failed to send SMS:', err);
    return false;
  }
}

/** SMS templates for order notifications. */

export function orderConfirmationSms(
  orderNumber: string,
  customerName: string,
  grandTotal: string,
  currency: string,
): string {
  return `Hi ${customerName}, your Sreepon order ${orderNumber} is confirmed. Total: ${currency} ${grandTotal}. We will update you when it ships.`;
}

export function orderStatusSms(orderNumber: string, customerName: string, status: string): string {
  const labels: Record<string, string> = {
    PENDING: 'received',
    CONFIRMED: 'confirmed',
    PROCESSING: 'being processed',
    PACKED: 'packed',
    SHIPPED: 'shipped',
    OUT_FOR_DELIVERY: 'out for delivery',
    DELIVERED: 'delivered',
    CANCELLED: 'cancelled',
    REFUNDED: 'refunded',
  };
  const label = labels[status] || status.toLowerCase();
  return `Hi ${customerName}, your Sreepon order ${orderNumber} is now ${label}. Track it anytime in your account.`;
}
