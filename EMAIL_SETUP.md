# Email Configuration Setup

## Overview
This setup configures Gmail SMTP with app password to send booking confirmation emails to customers and notification emails to admin.

## Configuration Details

### Gmail Account
- **Email**: preethijawaiy@gmail.com
- **App Password**: asiqlbqudiskuosw (stored in .env file)

### Features
1. **Customer Confirmation Email**: Sent to customer when booking is created via POST `/api/booking/simple`
2. **Admin Notification Email**: Sent to admin when any new booking is created
3. **Email Templates**: Professional HTML templates with booking details

## API Endpoints

### Booking Creation (with email)
```
POST /api/booking/simple

Body:
{
  "username": "John Doe",
  "email": "customer@example.com",
  "phone": "+1234567890",
  "date": "2025-09-25",
  "time": "10:00",
  "notes": "Optional notes"
}
```

### Test Email Functionality
```
# Test email connection
GET /api/email/test-connection

# Send test email
POST /api/email/test-send
{
  "email": "test@example.com"
}
```

## Email Templates

### Customer Confirmation Email
- ✓ Booking confirmation with green checkmark
- Booking reference number
- Date and time details
- Customer information
- Professional styling

### Admin Notification Email
- 🔔 New booking notification with bell icon
- Complete booking details
- Customer contact information
- Timestamp information

## Environment Variables

The following environment variables are configured in `.env`:

```env
EMAIL_USER=preethijawaiy@gmail.com
EMAIL_APP_PASSWORD=asiqlbqudiskuosw
EMAIL_FROM=preethijawaiy@gmail.com
ADMIN_EMAIL=preethijawaiy@gmail.com
```

## Testing

Run the test script to verify email functionality:

```bash
node test-email.js
```

## Security Notes

1. **App Password**: Gmail app password is used instead of regular password
2. **Environment Variables**: Sensitive credentials stored in .env file
3. **Error Handling**: Email failures don't block booking creation
4. **Async Processing**: Emails sent asynchronously to avoid blocking API responses

## Troubleshooting

1. **Connection Issues**: Verify Gmail app password is correct
2. **Authentication Errors**: Ensure 2FA is enabled and app password is generated
3. **SMTP Errors**: Check if Gmail SMTP settings are correct (smtp.gmail.com:587)
4. **Rate Limiting**: Gmail has sending limits, monitor for any restrictions

## Implementation Details

- **Email Service**: `src/utils/emailService.js`
- **Configuration**: `src/config/config.js`
- **Routes**: `src/routes/email.js`
- **Integration**: Added to `bookingController.js` for automatic sending