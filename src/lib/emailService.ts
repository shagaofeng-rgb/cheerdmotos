import tls from 'node:tls';
import {appendEmailLog, hasSentEmail, type StoreOrder} from '@/lib/commerceStore';

type MailPayload = {
  to: string;
  subject: string;
  text: string;
  html: string;
};

const DEFAULT_SMTP_HOST = 'smtp.exmail.qq.com';
const DEFAULT_SENDER_EMAIL = 'support@cheerdmotos.com';
const DEFAULT_ADMIN_NOTIFICATION_EMAIL = 'support@cheerdmotos.com';

function smtpConfig() {
  return {
    host: process.env.SMTP_HOST || DEFAULT_SMTP_HOST,
    port: Number(process.env.SMTP_PORT || 465),
    user: process.env.SMTP_USER || DEFAULT_SENDER_EMAIL,
    pass: process.env.SMTP_PASS || process.env.SMTP_PASSWORD || '',
    from: process.env.SMTP_FROM || process.env.EMAIL_FROM || DEFAULT_SENDER_EMAIL
  };
}

function b64(value: string) {
  return Buffer.from(value, 'utf8').toString('base64');
}

function escapeHtml(value: unknown) {
  return String(value || '').replace(/[&<>"']/g, (char) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;'
  })[char] || char);
}

function adminNotificationEmail() {
  return process.env.ADMIN_NOTIFICATION_EMAIL || process.env.SMTP_FROM || process.env.EMAIL_FROM || DEFAULT_ADMIN_NOTIFICATION_EMAIL;
}

function orderRows(order: StoreOrder) {
  return [
    ['Order ID', order.id],
    ['Status', order.status],
    ['Gateway status', order.gatewayStatus],
    ['Payment gateway', order.paymentGateway],
    ['Payment method', order.paymentMethod],
    ['Payment ID', order.paymentId || order.transactionId],
    ['Product', `${order.productName} x ${order.quantity}`],
    ['Amount', `${order.currency} ${order.total.toLocaleString()}`],
    ['Customer', order.customer.name],
    ['Email', order.customer.email],
    ['Phone', order.customer.phone],
    ['Company', order.customer.company],
    ['Country', order.customer.country],
    ['Address', order.customer.address],
    ['Checkout city/state/zip', [order.checkout.city, order.checkout.state, order.checkout.zip].filter(Boolean).join(', ')],
    ['Shipping method', order.checkout.shippingMethod],
    ['Card', [order.checkout.cardBrand, order.checkout.cardLast4 ? `**** ${order.checkout.cardLast4}` : ''].filter(Boolean).join(' ')],
    ['Customer note', order.customer.message],
    ['Created at', order.createdAt],
    ['Updated at', order.updatedAt]
  ];
}

function rowsText(rows: string[][]) {
  return rows.map(([label, value]) => `${label}: ${value || '-'}`).join('\n');
}

function rowsHtml(rows: string[][]) {
  return rows
    .map(([label, value]) => `<tr><td style="padding:7px 10px;border:1px solid #d8ddd9;vertical-align:top"><b>${escapeHtml(label)}</b></td><td style="padding:7px 10px;border:1px solid #d8ddd9">${escapeHtml(value || '-')}</td></tr>`)
    .join('');
}

async function sendSmtpMail(message: MailPayload) {
  const config = smtpConfig();
  if (!config.host || !config.user || !config.pass) {
    return {ok: false, skipped: true, message: 'SMTP is not configured'};
  }

  const socket = tls.connect({host: config.host, port: config.port, servername: config.host});
  let buffer = '';

  function readLine() {
    return new Promise<string>((resolve, reject) => {
      const cleanup = () => {
        clearTimeout(timeout);
        socket.off('data', onData);
        socket.off('error', onError);
      };
      const onError = (error: Error) => {
        cleanup();
        reject(error);
      };
      const timeout = setTimeout(() => {
        cleanup();
        reject(new Error('SMTP timeout'));
      }, 15000);
      const onData = (chunk: Buffer) => {
        buffer += chunk.toString('utf8');
        const lines = buffer.split(/\r?\n/).filter(Boolean);
        const last = lines[lines.length - 1] || '';
        if (/^\d{3} /.test(last)) {
          cleanup();
          const response = buffer;
          buffer = '';
          resolve(response);
        }
      };
      socket.on('data', onData);
      socket.on('error', onError);
    });
  }

  async function command(value: string, expected = /^[23]/) {
    socket.write(`${value}\r\n`);
    const response = await readLine();
    if (!expected.test(response)) throw new Error(response.trim());
    return response;
  }

  await new Promise<void>((resolve, reject) => {
    socket.once('secureConnect', resolve);
    socket.once('error', reject);
  });
  await readLine();
  await command(`EHLO ${config.host}`);
  await command('AUTH LOGIN', /^334/);
  await command(b64(config.user), /^334/);
  await command(b64(config.pass), /^235/);
  await command(`MAIL FROM:<${config.from}>`);
  await command(`RCPT TO:<${message.to}>`);
  await command('DATA', /^354/);

  const boundary = `cheerdmoto-${Date.now()}`;
  const raw = [
    `From: CHEERDMOTO <${config.from}>`,
    `To: ${message.to}`,
    `Subject: =?UTF-8?B?${b64(message.subject)}?=`,
    'MIME-Version: 1.0',
    `Content-Type: multipart/alternative; boundary="${boundary}"`,
    '',
    `--${boundary}`,
    'Content-Type: text/plain; charset=UTF-8',
    'Content-Transfer-Encoding: 8bit',
    '',
    message.text,
    '',
    `--${boundary}`,
    'Content-Type: text/html; charset=UTF-8',
    'Content-Transfer-Encoding: 8bit',
    '',
    message.html,
    '',
    `--${boundary}--`,
    '.'
  ].join('\r\n');

  socket.write(`${raw}\r\n`);
  const dataResponse = await readLine();
  await command('QUIT', /^[23]/).catch(() => undefined);
  socket.end();
  return {ok: true, skipped: false, message: dataResponse.trim()};
}

export async function sendOrderSuccessEmailOnce(order: StoreOrder) {
  if (await hasSentEmail(order.id, 'order_success')) return;
  const siteUrl = (process.env.NEXT_PUBLIC_SITE_URL || 'https://www.cheerdmotos.com').replace(/\/$/, '');
  const customerName = order.customer.name || `${order.checkout.firstName} ${order.checkout.lastName}`.trim() || 'Customer';
  const subject = `CHEERDMOTO order confirmed: ${order.id}`;
  const text = [
    `Hello ${customerName},`,
    '',
    'Your CHEERDMOTO payment has been confirmed.',
    `Order number: ${order.id}`,
    `Amount: ${order.currency} ${order.total.toLocaleString()}`,
    `Payment method: ${order.paymentMethod}`,
    `Product: ${order.productName} x ${order.quantity}`,
    `Order time: ${order.createdAt}`,
    `Website: ${siteUrl}`,
    '',
    'Our team will prepare the delivery and update logistics information after shipment.'
  ].join('\n');
  const html = `
    <div style="font-family:Arial,sans-serif;color:#111318;line-height:1.6">
      <h2>CHEERDMOTO order confirmed</h2>
      <p>Hello ${escapeHtml(customerName)}, your payment has been confirmed.</p>
      <table style="border-collapse:collapse;width:100%;max-width:620px">
        <tr><td><b>Order number</b></td><td>${escapeHtml(order.id)}</td></tr>
        <tr><td><b>Amount</b></td><td>${order.currency} ${order.total.toLocaleString()}</td></tr>
        <tr><td><b>Payment method</b></td><td>${escapeHtml(order.paymentMethod)}</td></tr>
        <tr><td><b>Product</b></td><td>${escapeHtml(order.productName)} x ${order.quantity}</td></tr>
        <tr><td><b>Order time</b></td><td>${escapeHtml(order.createdAt)}</td></tr>
      </table>
      <p><a href="${siteUrl}" style="color:#ee2f2f">Visit CHEERDMOTO</a></p>
    </div>
  `;

  try {
    const result = await sendSmtpMail({to: order.customer.email, subject, text, html});
    await appendEmailLog({
      orderId: order.id,
      customerEmail: order.customer.email,
      templateType: 'order_success',
      status: result.skipped ? 'skipped' : 'sent',
      providerMessageId: result.message,
      errorMessage: '',
      sentAt: result.skipped ? '' : new Date().toISOString()
    });
  } catch (error) {
    await appendEmailLog({
      orderId: order.id,
      customerEmail: order.customer.email,
      templateType: 'order_success',
      status: 'failed',
      providerMessageId: '',
      errorMessage: error instanceof Error ? error.message.slice(0, 500) : 'Unknown SMTP error',
      sentAt: ''
    });
  }
}

export async function sendAdminOrderNotice(order: StoreOrder, reason = 'order_submitted') {
  const adminEmail = adminNotificationEmail();
  const subject = `[CHEERDMOTO Order] ${reason}: ${order.id} - ${order.currency} ${order.total.toLocaleString()}`;
  const rows = [['Notice type', reason], ...orderRows(order)];
  const text = rowsText(rows);
  const html = `
    <div style="font-family:Arial,sans-serif;color:#111318;line-height:1.6">
      <h2>CHEERDMOTO order notification</h2>
      <p>A customer order event was recorded on cheerdmotos.com.</p>
      <table style="border-collapse:collapse;width:100%;max-width:780px">${rowsHtml(rows)}</table>
    </div>
  `;

  try {
    const result = await sendSmtpMail({to: adminEmail, subject, text, html});
    await appendEmailLog({
      orderId: order.id,
      customerEmail: order.customer.email,
      templateType: 'admin_order_notice',
      status: result.skipped ? 'skipped' : 'sent',
      providerMessageId: result.message,
      errorMessage: '',
      sentAt: result.skipped ? '' : new Date().toISOString()
    });
    return result;
  } catch (error) {
    await appendEmailLog({
      orderId: order.id,
      customerEmail: order.customer.email,
      templateType: 'admin_order_notice',
      status: 'failed',
      providerMessageId: '',
      errorMessage: error instanceof Error ? error.message.slice(0, 500) : 'Unknown SMTP error',
      sentAt: ''
    });
    return {ok: false, skipped: false, message: error instanceof Error ? error.message : 'Unknown SMTP error'};
  }
}

export async function sendAdminPaymentNotice(order: StoreOrder, input: {
  source: string;
  verified?: boolean;
  paymentStatus?: string;
  paymentId?: string;
  detail?: string;
}) {
  const adminEmail = adminNotificationEmail();
  const statusLabel = input.paymentStatus || order.status || order.gatewayStatus || 'unknown';
  const subject = `[CHEERDMOTO Payment] ${statusLabel}: ${order.id}`;
  const rows = [
    ['Notice source', input.source],
    ['Verified', typeof input.verified === 'boolean' ? String(input.verified) : ''],
    ['Gateway payment status', input.paymentStatus || ''],
    ['Payment ID', input.paymentId || order.paymentId || order.transactionId],
    ['Detail', input.detail || ''],
    ...orderRows(order)
  ];
  const text = rowsText(rows);
  const html = `
    <div style="font-family:Arial,sans-serif;color:#111318;line-height:1.6">
      <h2>CHEERDMOTO payment notification</h2>
      <p>A payment update was received. This notice is sent whether the payment succeeded, failed, is processing, or could not be verified.</p>
      <table style="border-collapse:collapse;width:100%;max-width:780px">${rowsHtml(rows)}</table>
    </div>
  `;

  try {
    const result = await sendSmtpMail({to: adminEmail, subject, text, html});
    await appendEmailLog({
      orderId: order.id,
      customerEmail: order.customer.email,
      templateType: 'admin_payment_notice',
      status: result.skipped ? 'skipped' : 'sent',
      providerMessageId: result.message,
      errorMessage: '',
      sentAt: result.skipped ? '' : new Date().toISOString()
    });
    return result;
  } catch (error) {
    await appendEmailLog({
      orderId: order.id,
      customerEmail: order.customer.email,
      templateType: 'admin_payment_notice',
      status: 'failed',
      providerMessageId: '',
      errorMessage: error instanceof Error ? error.message.slice(0, 500) : 'Unknown SMTP error',
      sentAt: ''
    });
    return {ok: false, skipped: false, message: error instanceof Error ? error.message : 'Unknown SMTP error'};
  }
}

export async function sendAccountActivationEmail(order: StoreOrder, setupUrl: string) {
  const alreadySent = await hasSentEmail(order.id, 'account_activation');
  if (alreadySent) return;
  const subject = `Set up your CHEERDMOTO account for order ${order.id}`;
  const text = `Your CHEERDMOTO account is ready. Set your password here: ${setupUrl}`;
  const html = `<p>Your CHEERDMOTO account is ready.</p><p><a href="${escapeHtml(setupUrl)}">Set your password</a></p>`;
  try {
    const result = await sendSmtpMail({to: order.customer.email, subject, text, html});
    await appendEmailLog({
      orderId: order.id,
      customerEmail: order.customer.email,
      templateType: 'account_activation',
      status: result.skipped ? 'skipped' : 'sent',
      providerMessageId: result.message,
      errorMessage: '',
      sentAt: result.skipped ? '' : new Date().toISOString()
    });
  } catch (error) {
    await appendEmailLog({
      orderId: order.id,
      customerEmail: order.customer.email,
      templateType: 'account_activation',
      status: 'failed',
      providerMessageId: '',
      errorMessage: error instanceof Error ? error.message.slice(0, 500) : 'Unknown SMTP error',
      sentAt: ''
    });
  }
}

export async function sendPasswordResetEmail(email: string, resetUrl: string) {
  const subject = 'Reset your CHEERDMOTO account password';
  const text = [
    'CHEERDMOTO account password reset',
    '',
    `Use this link within 60 minutes: ${resetUrl}`,
    '',
    'If you did not request this, you can ignore this email.',
    'Support: support@cheerdmotos.com'
  ].join('\n');
  const html = `
    <p>Hello,</p>
    <p>We received a request to reset your CHEERDMOTO customer account password.</p>
    <p><a href="${escapeHtml(resetUrl)}">Set a new password</a></p>
    <p>This link is valid for 60 minutes. If you did not request this, you can ignore this email.</p>
    <p>Support: support@cheerdmotos.com</p>
  `;
  try {
    const result = await sendSmtpMail({to: email, subject, text, html});
    await appendEmailLog({
      orderId: 'account',
      customerEmail: email,
      templateType: 'password_reset',
      status: result.skipped ? 'skipped' : 'sent',
      providerMessageId: result.message,
      errorMessage: '',
      sentAt: result.skipped ? '' : new Date().toISOString()
    });
  } catch (error) {
    await appendEmailLog({
      orderId: 'account',
      customerEmail: email,
      templateType: 'password_reset',
      status: 'failed',
      providerMessageId: '',
      errorMessage: error instanceof Error ? error.message.slice(0, 500) : 'Unknown SMTP error',
      sentAt: ''
    });
  }
}

export async function sendRegistrationWelcomeEmail(email: string, name: string) {
  const siteUrl = (process.env.NEXT_PUBLIC_SITE_URL || 'https://www.cheerdmotos.com').replace(/\/$/, '');
  const customerName = name || 'Customer';
  const subject = 'Welcome to your CHEERDMOTO customer account';
  const text = [
    `Hello ${customerName},`,
    '',
    'Your CHEERDMOTO customer account has been created.',
    'You can now view your orders, payment status and shipment updates from the account center.',
    '',
    `Account center: ${siteUrl}/account/orders`,
    'Support: support@cheerdmotos.com'
  ].join('\n');
  const html = `
    <div style="font-family:Arial,sans-serif;color:#111318;line-height:1.6;background:#f6f8f5;padding:24px">
      <div style="max-width:620px;margin:0 auto;background:#ffffff;border:1px solid #d8ddd9;border-radius:8px;padding:28px">
        <p style="margin:0 0 10px;color:#0077c8;font-size:12px;font-weight:700;text-transform:uppercase">CHEERDMOTO customer account</p>
        <h2 style="margin:0 0 14px;color:#111318">Welcome, ${escapeHtml(customerName)}</h2>
        <p>Your customer account has been created. You can now view order history, payment status and shipment updates in one place.</p>
        <p><a href="${siteUrl}/account/orders" style="display:inline-block;background:#ee2f2f;color:#ffffff;padding:12px 18px;border-radius:6px;text-decoration:none;font-weight:700">Open account center</a></p>
        <p style="margin-top:24px;color:#5e6470;font-size:14px">If this was not you, please contact support@cheerdmotos.com.</p>
      </div>
    </div>
  `;
  try {
    const result = await sendSmtpMail({to: email, subject, text, html});
    await appendEmailLog({
      orderId: 'account',
      customerEmail: email,
      templateType: 'account_registration',
      status: result.skipped ? 'skipped' : 'sent',
      providerMessageId: result.message,
      errorMessage: '',
      sentAt: result.skipped ? '' : new Date().toISOString()
    });
  } catch (error) {
    await appendEmailLog({
      orderId: 'account',
      customerEmail: email,
      templateType: 'account_registration',
      status: 'failed',
      providerMessageId: '',
      errorMessage: error instanceof Error ? error.message.slice(0, 500) : 'Unknown SMTP error',
      sentAt: ''
    });
  }
}

export async function sendContactInquiryEmail(input: {
  name: string;
  email: string;
  phone: string;
  country: string;
  company: string;
  buyerType: string;
  product: string;
  quantity: string;
  targetMarket: string;
  waterArea: string;
  oem: string;
  destinationPort: string;
  message: string;
}) {
  const adminEmail = adminNotificationEmail();
  const subject = `New CHEERDMOTO inquiry from ${input.email}`;
  const rows = [
    ['Name', input.name],
    ['Email', input.email],
    ['Phone / WhatsApp', input.phone],
    ['Country / Region', input.country],
    ['Company', input.company],
    ['Buyer type', input.buyerType],
    ['Interested product', input.product],
    ['Expected quantity', input.quantity],
    ['Target market', input.targetMarket],
    ['Water area', input.waterArea],
    ['OEM/ODM', input.oem],
    ['Destination port', input.destinationPort],
    ['Message', input.message]
  ];
  const text = rows.map(([label, value]) => `${label}: ${value || '-'}`).join('\n');
  const html = `
    <div style="font-family:Arial,sans-serif;color:#111318;line-height:1.6">
      <h2>New CHEERDMOTO website inquiry</h2>
      <table style="border-collapse:collapse;width:100%;max-width:720px">
        ${rows.map(([label, value]) => `<tr><td style="padding:7px 10px;border:1px solid #d8ddd9"><b>${escapeHtml(label)}</b></td><td style="padding:7px 10px;border:1px solid #d8ddd9">${escapeHtml(value || '-')}</td></tr>`).join('')}
      </table>
    </div>
  `;

  try {
    const result = await sendSmtpMail({to: adminEmail, subject, text, html});
    await appendEmailLog({
      orderId: 'contact',
      customerEmail: input.email,
      templateType: 'contact_inquiry',
      status: result.skipped ? 'skipped' : 'sent',
      providerMessageId: result.message,
      errorMessage: '',
      sentAt: result.skipped ? '' : new Date().toISOString()
    });
    return result;
  } catch (error) {
    await appendEmailLog({
      orderId: 'contact',
      customerEmail: input.email,
      templateType: 'contact_inquiry',
      status: 'failed',
      providerMessageId: '',
      errorMessage: error instanceof Error ? error.message.slice(0, 500) : 'Unknown SMTP error',
      sentAt: ''
    });
    throw error;
  }
}
