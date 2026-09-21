import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';
import type { Transporter } from 'nodemailer';

import { MailQueueService } from './mail-queue.service';
import { ConfirmacionCompraEmailDto } from './dto/confirmacion-compra.dto';
import { EmailBienvenidaDto } from './dto/email-bienvenida.dto';

@Injectable()
export class MailService implements OnModuleInit {
  private readonly logger = new Logger(MailService.name);
  private transporter: Transporter;
  private readonly defaultFrom: string;

  constructor(
    private readonly configService: ConfigService,
    private readonly mailQueueService: MailQueueService,
  ) {
    const host = this.configService.get<string>('mail.host') || 'live.smtp.mailtrap.io';
    const port = this.configService.get<number>('mail.port') || 587;
    const user = this.configService.get<string>('mail.user') || 'api';
    const pass = this.configService.get<string>('mail.password') || '';
    this.defaultFrom = this.configService.get<string>('mail.from') || 'El Magnifico <hello@demomailtrap.co>';

    this.transporter = nodemailer.createTransport({
      host,
      port,
      secure: port === 465,
      auth: {
        user,
        pass,
      },
    });

    this.logger.log(`📧 Mailtrap Transport configurado en ${host}:${port}`);
  }

  onModuleInit() {
    // Registrar el emisor SMTP en la cola de background
    this.mailQueueService.registrarEmisor((opciones) => this.enviarCorreo(opciones));
  }

  /**
   * Envía un correo de forma síncrona a través de Mailtrap SMTP
   */
  async enviarCorreo(opciones: {
    to: string;
    subject: string;
    text?: string;
    html: string;
    from?: string;
  }): Promise<{ messageId?: string; success: boolean }> {
    try {
      const from = opciones.from || this.defaultFrom;
      const info = await this.transporter.sendMail({
        from,
        to: opciones.to,
        subject: opciones.subject,
        text: opciones.text,
        html: opciones.html,
      });

      this.logger.log(`✅ Correo enviado a [${opciones.to}]: Message ID ${info.messageId}`);
      this.logger.log(`🔍 Verifica los logs de envío en: https://mailtrap.io/sending/email_logs`);
      return { messageId: info.messageId, success: true };
    } catch (error) {
      this.logger.error(`❌ Error al enviar correo a ${opciones.to}:`, error?.message || error);
      this.logger.warn(`💡 Verifica tus credenciales de Mailtrap en el archivo .env (MAIL_USER, MAIL_PASSWORD)`);
      return { success: false };
    }
  }

  // =========================================================================
  // HU-84: CORREO DE BIENVENIDA AL REGISTRARSE
  // =========================================================================
  async enviarEmailBienvenida(dto: EmailBienvenidaDto, encolar: boolean = true) {
    const appUrl = this.configService.get<string>('appUrl') || 'http://localhost:5173';
    const catalogoUrl = dto.enlaceCatalogo || `${appUrl}/catalogo`;

    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <style>
          body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f1f5f9; margin: 0; padding: 20px; color: #1e293b; }
          .container { max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 10px 25px -5px rgba(0,0,0,0.1); }
          .header { background: linear-gradient(135deg, #0ea5e9 0%, #6366f1 50%, #a855f7 100%); padding: 40px 30px; text-align: center; color: white; }
          .header h1 { margin: 0; font-size: 28px; font-weight: 800; letter-spacing: 0.5px; }
          .header p { margin: 8px 0 0 0; font-size: 16px; opacity: 0.95; }
          .content { padding: 35px 30px; line-height: 1.7; }
          .greeting { font-size: 20px; font-weight: 700; color: #0f172a; margin-bottom: 15px; }
          .perks { background: #f8fafc; border-radius: 12px; padding: 20px; margin: 25px 0; border: 1px solid #e2e8f0; }
          .perk-item { display: flex; align-items: center; margin-bottom: 12px; font-size: 14px; }
          .perk-item:last-child { margin-bottom: 0; }
          .perk-icon { margin-right: 12px; font-size: 18px; }
          .btn-container { text-align: center; margin: 30px 0; }
          .btn { background: #4f46e5; color: #ffffff !important; text-decoration: none; padding: 15px 32px; border-radius: 10px; font-weight: 700; font-size: 16px; display: inline-block; box-shadow: 0 4px 12px rgba(79, 70, 229, 0.35); }
          .footer { background: #f8fafc; padding: 25px; text-align: center; font-size: 13px; color: #64748b; border-top: 1px solid #e2e8f0; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>¡Te damos la Bienvenida!</h1>
            <p>A la experiencia de moda en El Magnífico</p>
          </div>
          <div class="content">
            <div class="greeting">¡Hola, ${dto.nombre}!</div>
            <p>Estamos muy felices de que te unas a nuestra comunidad. En <strong>El Magnífico</strong> nos apasiona brindarte las mejores tendencias en ropa, la máxima calidad y una experiencia de compra rápida y segura.</p>
            
            <div class="perks">
              <div class="perk-item"><strong>Envíos rápidos:</strong> A todo el país con seguimiento en tiempo real.</div>
              <div class="perk-item"><strong>Cupones y promociones exclusivas:</strong> Para miembros registrados.</div>
              <div class="perk-item"><strong>Pagos 100% seguros:</strong> Con QR Simple y pasarelas verificadas.</div>
              <div class="perk-item"><strong>Sincronización total:</strong> Entre nuestra web y app móvil.</div>
            </div>

            <div class="btn-container">
              <a href="${catalogoUrl}" class="btn">Explorar Colecciones</a>
            </div>

            <p style="font-size: 14px; color: #64748b;">Si tienes alguna pregunta o requieres asistencia con tu cuenta, nuestro equipo de soporte está siempre listo para ayudarte.</p>
          </div>
          <div class="footer">
            <p>© ${new Date().getFullYear()} El Magnífico E-Commerce. Todos los derechos reservados.</p>
            <p><small>Monitorea este envío en <a href="https://mailtrap.io/sending/email_logs" target="_blank" style="color: #4f46e5;">Mailtrap Logs</a></small></p>
          </div>
        </div>
      </body>
      </html>
    `;

    const subject = `¡Bienvenido/a a El Magnífico, ${dto.nombre}!`;
    const text = `Hola ${dto.nombre}, te damos la bienvenida a El Magnífico. Explora nuestras colecciones en: ${catalogoUrl}`;

    if (encolar) {
      return this.mailQueueService.encolar({
        tipo: 'BIENVENIDA',
        destinatario: dto.correo,
        asunto: subject,
        html,
        text,
      });
    }

    return this.enviarCorreo({ to: dto.correo, subject, html, text });
  }

  // =========================================================================
  // HU-85: CORREO DE RECUPERACIÓN DE CONTRASEÑA
  // =========================================================================
  async enviarEmailRecuperacion(correo: string, nombre: string, token: string, encolar: boolean = true) {
    const appUrl = this.configService.get<string>('appUrl') || 'http://localhost:5173';
    const enlaceRecuperacion = `${appUrl}/restablecer-password?token=${token}`;

    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <style>
          body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f8fafc; margin: 0; padding: 20px; color: #1e293b; }
          .container { max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1); }
          .header { background: linear-gradient(135deg, #dc2626 0%, #ea580c 100%); padding: 30px; text-align: center; color: white; }
          .header h1 { margin: 0; font-size: 24px; font-weight: 700; }
          .content { padding: 30px; line-height: 1.6; }
          .btn-container { text-align: center; margin: 30px 0; }
          .btn { background: #dc2626; color: #ffffff !important; text-decoration: none; padding: 14px 28px; border-radius: 8px; font-weight: 600; display: inline-block; }
          .token-box { background: #fef2f2; border: 1px dashed #ef4444; padding: 15px; border-radius: 8px; font-family: monospace; font-size: 16px; word-break: break-all; text-align: center; margin: 20px 0; color: #991b1b; }
          .footer { background: #f1f5f9; padding: 20px; text-align: center; font-size: 12px; color: #64748b; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Recuperación de Contraseña</h1>
          </div>
          <div class="content">
            <h2>Estimado/a ${nombre},</h2>
            <p>Hemos recibido una solicitud para restablecer la contraseña de tu cuenta en <strong>El Magnífico</strong>.</p>
            <p>Haz clic en el siguiente botón para elegir una nueva contraseña segura:</p>
            <div class="btn-container">
              <a href="${enlaceRecuperacion}" class="btn">Restablecer Contraseña</a>
            </div>
            <p>O ingresa el siguiente código de seguridad en la aplicación:</p>
            <div class="token-box">${token}</div>
            <p><strong>Nota:</strong> Este enlace y código expirará en 1 hora por razones de seguridad.</p>
            <p><small>Si no solicitaste este cambio, puedes ignorar este correo; tu cuenta permanece segura.</small></p>
          </div>
          <div class="footer">
            <p>© ${new Date().getFullYear()} El Magnífico. Todos los derechos reservados.</p>
            <p>Monitorea este envío en <a href="https://mailtrap.io/sending/email_logs" target="_blank">Mailtrap Logs</a></p>
          </div>
        </div>
      </body>
      </html>
    `;

    const subject = 'Restablecer contraseña - El Magnífico';
    const text = `Hola ${nombre}, solicitaste restablecer tu contraseña. Ingresa a: ${enlaceRecuperacion} o usa el token: ${token}`;

    if (encolar) {
      return this.mailQueueService.encolar({
        tipo: 'RECUPERACION_PASSWORD',
        destinatario: correo,
        asunto: subject,
        html,
        text,
      });
    }

    return this.enviarCorreo({ to: correo, subject, html, text });
  }

  // =========================================================================
  // HU-86: CORREO DE CONFIRMACIÓN DE COMPRA / FACTURA
  // =========================================================================
  async enviarEmailConfirmacionCompra(datos: ConfirmacionCompraEmailDto, encolar: boolean = true) {
    const fechaCompra = datos.fecha ? new Date(datos.fecha).toLocaleString() : new Date().toLocaleString();
    const descuento = Number(datos.descuento || 0);
    const costoEnvio = Number(datos.costoEnvio || 0);

    const itemsFilasHtml = datos.items
      .map(
        (item) => `
        <tr style="border-bottom: 1px solid #e2e8f0;">
          <td style="padding: 12px 8px;">
            <div style="font-weight: 600; color: #0f172a;">${item.nombre}</div>
            ${item.talla || item.color ? `<div style="font-size: 12px; color: #64748b;">${item.talla ? `Talla: ${item.talla}` : ''} ${item.color ? `· Color: ${item.color}` : ''}</div>` : ''}
          </td>
          <td style="padding: 12px 8px; text-align: center; color: #334155;">${item.cantidad}</td>
          <td style="padding: 12px 8px; text-align: right; color: #334155;">Bs. ${Number(item.precioUnitario).toFixed(2)}</td>
          <td style="padding: 12px 8px; text-align: right; font-weight: 600; color: #0f172a;">Bs. ${Number(item.subtotal).toFixed(2)}</td>
        </tr>
      `,
      )
      .join('');

    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <style>
          body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f8fafc; margin: 0; padding: 20px; color: #1e293b; }
          .container { max-width: 650px; margin: 0 auto; background: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 10px 25px -5px rgba(0,0,0,0.1); }
          .header { background: linear-gradient(135deg, #10b981 0%, #059669 100%); padding: 35px 30px; text-align: center; color: white; }
          .header h1 { margin: 0; font-size: 26px; font-weight: 800; }
          .content { padding: 30px; }
          .order-badge { display: inline-block; background: #ecfdf5; color: #065f46; border: 1px solid #a7f3d0; padding: 6px 14px; border-radius: 20px; font-weight: 700; font-size: 13px; margin: 15px 0; }
          .info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 15px; margin: 20px 0; background: #f8fafc; padding: 18px; border-radius: 12px; font-size: 13px; }
          .info-block div:first-child { color: #64748b; font-weight: 500; }
          .info-block div:last-child { color: #0f172a; font-weight: 700; margin-top: 3px; }
          .table { width: 100%; border-collapse: collapse; margin: 25px 0 15px 0; font-size: 14px; }
          .table th { background: #f1f5f9; padding: 10px 8px; text-align: left; font-size: 12px; text-transform: uppercase; color: #475569; letter-spacing: 0.5px; }
          .totals-table { width: 100%; margin-top: 15px; font-size: 14px; }
          .totals-table td { padding: 6px 8px; }
          .total-row { font-size: 18px; font-weight: 800; color: #0f172a; border-top: 2px solid #0f172a; }
          .footer { background: #f8fafc; padding: 20px; text-align: center; font-size: 12px; color: #64748b; border-top: 1px solid #e2e8f0; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>¡Gracias por tu compra!</h1>
            <p style="margin: 5px 0 0 0; opacity: 0.9;">Tu pedido ha sido confirmado y está en preparación.</p>
          </div>
          <div class="content">
            <h2>Hola, ${datos.nombreCliente}</h2>
            <p>Hemos recibido tu pedido exitosamente. A continuación encontrarás el resumen detallado de tu compra:</p>
            
            <div style="text-align: center;">
              <span class="order-badge">N° Pedido: ${datos.nroPedido}</span>
            </div>

            <div class="info-grid">
              <div class="info-block">
                <div>Fecha de Compra</div>
                <div>${fechaCompra}</div>
              </div>
              <div class="info-block">
                <div>Método de Pago</div>
                <div>${datos.metodoPago || 'Pago Electrónico'}</div>
              </div>
              ${datos.direccionEntrega ? `
              <div class="info-block" style="grid-column: span 2;">
                <div>Dirección de Entrega</div>
                <div>${datos.direccionEntrega}</div>
              </div>` : ''}
            </div>

            <h3>Detalle de Artículos</h3>
            <table class="table">
              <thead>
                <tr>
                  <th>Producto</th>
                  <th style="text-align: center;">Cant.</th>
                  <th style="text-align: right;">P. Unit.</th>
                  <th style="text-align: right;">Subtotal</th>
                </tr>
              </thead>
              <tbody>
                ${itemsFilasHtml}
              </tbody>
            </table>

            <table class="totals-table">
              <tr>
                <td style="text-align: right; color: #64748b;">Subtotal:</td>
                <td style="text-align: right; width: 120px; font-weight: 600;">Bs. ${Number(datos.subtotal).toFixed(2)}</td>
              </tr>
              ${descuento > 0 ? `
              <tr>
                <td style="text-align: right; color: #16a34a;">Descuento ${datos.cuponCodigo ? `(Cupón "${datos.cuponCodigo}")` : ''}:</td>
                <td style="text-align: right; color: #16a34a; font-weight: 600;">- Bs. ${descuento.toFixed(2)}</td>
              </tr>` : ''}
              ${costoEnvio > 0 ? `
              <tr>
                <td style="text-align: right; color: #64748b;">Costo de Envío:</td>
                <td style="text-align: right; font-weight: 600;">Bs. ${costoEnvio.toFixed(2)}</td>
              </tr>` : ''}
              <tr class="total-row">
                <td style="text-align: right; padding-top: 10px;">Total Pagado:</td>
                <td style="text-align: right; padding-top: 10px; color: #059669;">Bs. ${Number(datos.total).toFixed(2)}</td>
              </tr>
            </table>

            <p style="margin-top: 30px; font-size: 13px; color: #64748b;">Te notificaremos cuando tu pedido sea despachado con la información de rastreo.</p>
          </div>
          <div class="footer">
            <p>© ${new Date().getFullYear()} El Magnífico E-Commerce. Todos los derechos reservados.</p>
            <p><small>Monitorea este envío en <a href="https://mailtrap.io/sending/email_logs" target="_blank" style="color: #059669;">Mailtrap Logs</a></small></p>
          </div>
        </div>
      </body>
      </html>
    `;

    const subject = `Confirmación de Pedido #${datos.nroPedido} - El Magnífico`;
    const text = `Hola ${datos.nombreCliente}, confirmamos tu pedido #${datos.nroPedido} por un total de Bs. ${Number(datos.total).toFixed(2)}.`;

    if (encolar) {
      return this.mailQueueService.encolar({
        tipo: 'CONFIRMACION_COMPRA',
        destinatario: datos.correo,
        asunto: subject,
        html,
        text,
      });
    }

    return this.enviarCorreo({ to: datos.correo, subject, html, text });
  }

  // =========================================================================
  // HU-07: CORREO DE VERIFICACIÓN DE CUENTA
  // =========================================================================
  async enviarEmailVerificacion(correo: string, nombre: string, token: string, encolar: boolean = true) {
    const appUrl = this.configService.get<string>('appUrl') || 'http://localhost:5173';
    const apiUrl = this.configService.get<string>('apiUrl') || 'http://localhost:3000/api/v1';
    const enlaceVerificacion = `${appUrl}/verificar-email?token=${token}`;
    const enlaceApi = `${apiUrl}/auth/verificar-email?token=${token}`;

    this.logger.log(`🔗 [DEBUG LOCAL] Token de verificación para ${correo}: ${token}`);
    this.logger.log(`🔗 [DEBUG LOCAL] Enlace directo de verificación: ${enlaceApi}`);

    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <style>
          body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f8fafc; margin: 0; padding: 20px; color: #1e293b; }
          .container { max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1); }
          .header { background: linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%); padding: 30px; text-align: center; color: white; }
          .header h1 { margin: 0; font-size: 24px; font-weight: 700; letter-spacing: 0.5px; }
          .content { padding: 30px; line-height: 1.6; }
          .btn-container { text-align: center; margin: 30px 0; }
          .btn { background: #4f46e5; color: #ffffff !important; text-decoration: none; padding: 14px 28px; border-radius: 8px; font-weight: 600; display: inline-block; }
          .token-box { background: #f1f5f9; padding: 15px; border-radius: 8px; font-family: monospace; font-size: 16px; word-break: break-all; text-align: center; margin: 20px 0; }
          .footer { background: #f1f5f9; padding: 20px; text-align: center; font-size: 12px; color: #64748b; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>El Magnífico — E-Commerce</h1>
          </div>
          <div class="content">
            <h2>¡Hola, ${nombre}!</h2>
            <p>Gracias por unirte a nuestra tienda. Para activar tu cuenta y asegurar tus compras, por favor confirma tu dirección de correo electrónico.</p>
            <div class="btn-container">
              <a href="${enlaceVerificacion}" class="btn">Verificar mi Correo</a>
            </div>
            <p>O si prefieres, utiliza este token de verificación en la aplicación:</p>
            <div class="token-box">${token}</div>
            <p><small>Si no creaste una cuenta en El Magnífico, puedes ignorar este mensaje.</small></p>
          </div>
          <div class="footer">
            <p>© ${new Date().getFullYear()} El Magnífico. Todos los derechos reservados.</p>
            <p>Monitorea este envío en <a href="https://mailtrap.io/sending/email_logs" target="_blank">Mailtrap Logs</a></p>
          </div>
        </div>
      </body>
      </html>
    `;

    const subject = 'Confirma tu correo electrónico - El Magnífico';
    const text = `Hola ${nombre}, verifica tu cuenta en El Magnífico ingresando a este enlace: ${enlaceVerificacion} o usando el token: ${token}`;

    if (encolar) {
      return this.mailQueueService.encolar({
        tipo: 'VERIFICACION_EMAIL',
        destinatario: correo,
        asunto: subject,
        html,
        text,
      });
    }

    return this.enviarCorreo({ to: correo, subject, html, text });
  }
}
