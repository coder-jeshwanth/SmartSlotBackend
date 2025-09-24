const nodemailer = require('nodemailer');
const config = require('../config/config');

class EmailService {
  constructor() {
    this.transporter = nodemailer.createTransport({
      host: config.email.smtp.host,
      port: config.email.smtp.port,
      secure: config.email.smtp.secure,
      auth: {
        user: config.email.smtp.auth.user,
        pass: config.email.smtp.auth.pass.replace(/\s/g, '') // Remove spaces from app password
      }
    });
  }

  /**
   * Send booking confirmation email to customer
   */
  async sendBookingConfirmation(booking) {
    const customerEmailOptions = {
      from: config.email.from,
      to: booking.customer.email,
      subject: `Booking Confirmation - ${booking.bookingReference}`,
      html: this.generateCustomerConfirmationEmail(booking)
    };

    try {
      await this.transporter.sendMail(customerEmailOptions);
      console.log(`Booking confirmation email sent to ${booking.customer.email}`);
    } catch (error) {
      console.error('Error sending customer confirmation email:', error);
      throw error;
    }
  }

  /**
   * Send booking notification email to admin
   */
  async sendAdminNotification(booking) {
    const adminEmailOptions = {
      from: config.email.from,
      to: config.email.adminEmail,
      subject: `New Booking Received - ${booking.bookingReference}`,
      html: this.generateAdminNotificationEmail(booking)
    };

    try {
      await this.transporter.sendMail(adminEmailOptions);
      console.log(`Admin notification email sent to ${config.email.adminEmail}`);
    } catch (error) {
      console.error('Error sending admin notification email:', error);
      throw error;
    }
  }

  /**
   * Send both customer confirmation and admin notification
   */
  async sendBookingEmails(booking) {
    try {
      await Promise.all([
        this.sendBookingConfirmation(booking),
        this.sendAdminNotification(booking)
      ]);
    } catch (error) {
      console.error('Error sending booking emails:', error);
      // Don't throw error to prevent booking failure due to email issues
    }
  }

  /**
   * Generate customer confirmation email HTML
   */
  generateCustomerConfirmationEmail(booking) {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>Booking Confirmation</title>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background-color: #4CAF50; color: white; padding: 20px; text-align: center; }
          .content { padding: 20px; background-color: #f9f9f9; }
          .booking-details { background-color: white; padding: 15px; margin: 15px 0; border-radius: 5px; }
          .footer { text-align: center; padding: 20px; color: #666; font-size: 14px; }
          .success-icon { font-size: 48px; color: #4CAF50; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <div class="success-icon">✓</div>
            <h1>Booking Confirmed!</h1>
          </div>
          
          <div class="content">
            <p>Dear ${booking.customer.name},</p>
            
            <p>Your booking has been successfully confirmed. Here are your booking details:</p>
            
            <div class="booking-details">
              <h3>Booking Information</h3>
              <p><strong>Booking Reference:</strong> ${booking.bookingReference}</p>
              <p><strong>Date:</strong> ${new Date(booking.date).toLocaleDateString('en-US', { 
                weekday: 'long', 
                year: 'numeric', 
                month: 'long', 
                day: 'numeric' 
              })}</p>
              <p><strong>Time:</strong> ${booking.timeSlot}</p>
              <p><strong>Status:</strong> ${booking.status}</p>
              ${booking.customer.notes ? `<p><strong>Notes:</strong> ${booking.customer.notes}</p>` : ''}
            </div>
            
            <div class="booking-details">
              <h3>Contact Information</h3>
              <p><strong>Name:</strong> ${booking.customer.name}</p>
              <p><strong>Email:</strong> ${booking.customer.email}</p>
              <p><strong>Phone:</strong> ${booking.customer.phone}</p>
            </div>
            
            <p>Please save this email for your records. If you need to make any changes or have questions about your booking, please contact us.</p>
            
            <p>Thank you for choosing our service!</p>
          </div>
          
          <div class="footer">
            <p>This is an automated message. Please do not reply to this email.</p>
            <p>© ${new Date().getFullYear()} SmartSlot Booking System</p>
          </div>
        </div>
      </body>
      </html>
    `;
  }

  /**
   * Generate admin notification email HTML
   */
  generateAdminNotificationEmail(booking) {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>New Booking Notification</title>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background-color: #2196F3; color: white; padding: 20px; text-align: center; }
          .content { padding: 20px; background-color: #f9f9f9; }
          .booking-details { background-color: white; padding: 15px; margin: 15px 0; border-radius: 5px; }
          .footer { text-align: center; padding: 20px; color: #666; font-size: 14px; }
          .notification-icon { font-size: 48px; color: #2196F3; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <div class="notification-icon">🔔</div>
            <h1>New Booking Received</h1>
          </div>
          
          <div class="content">
            <p>A new booking has been made on the SmartSlot system.</p>
            
            <div class="booking-details">
              <h3>Booking Information</h3>
              <p><strong>Booking Reference:</strong> ${booking.bookingReference}</p>
              <p><strong>Date:</strong> ${new Date(booking.date).toLocaleDateString('en-US', { 
                weekday: 'long', 
                year: 'numeric', 
                month: 'long', 
                day: 'numeric' 
              })}</p>
              <p><strong>Time:</strong> ${booking.timeSlot}</p>
              <p><strong>Status:</strong> ${booking.status}</p>
              <p><strong>Created:</strong> ${new Date(booking.createdAt).toLocaleString()}</p>
              ${booking.customer.notes ? `<p><strong>Notes:</strong> ${booking.customer.notes}</p>` : ''}
            </div>
            
            <div class="booking-details">
              <h3>Customer Information</h3>
              <p><strong>Name:</strong> ${booking.customer.name}</p>
              <p><strong>Email:</strong> ${booking.customer.email}</p>
              <p><strong>Phone:</strong> ${booking.customer.phone}</p>
            </div>
            
            <p>Please review this booking and take any necessary actions.</p>
          </div>
          
          <div class="footer">
            <p>SmartSlot Admin Notification System</p>
            <p>© ${new Date().getFullYear()} SmartSlot Booking System</p>
          </div>
        </div>
      </body>
      </html>
    `;
  }

  /**
   * Test email connection
   */
  async testConnection() {
    try {
      await this.transporter.verify();
      console.log('Email service connection verified successfully');
      return true;
    } catch (error) {
      console.error('Email service connection failed:', error);
      return false;
    }
  }
}

module.exports = new EmailService();