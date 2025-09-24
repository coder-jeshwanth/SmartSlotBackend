const nodemailer = require('nodemailer');

// Test email configuration directly
const testEmailConfig = async () => {
  console.log('Testing email configuration...');
  
  const transporter = nodemailer.createTransport({
    host: 'smtp.gmail.com',
    port: 587,
    secure: false,
    auth: {
      user: 'preethijawaiy@gmail.com',
      pass: 'asiqlbqudiskuosw'
    }
  });

  try {
    // Test connection
    console.log('Testing SMTP connection...');
    await transporter.verify();
    console.log('✅ SMTP connection successful!');

    // Send test email
    console.log('Sending test email...');
    const info = await transporter.sendMail({
      from: 'preethijawaiy@gmail.com',
      to: 'preethijawaiy@gmail.com',
      subject: 'Test Email from SmartSlot',
      html: `
        <h2>Test Email</h2>
        <p>This is a test email to verify the email configuration.</p>
        <p>Sent at: ${new Date().toLocaleString()}</p>
      `
    });

    console.log('✅ Test email sent successfully!');
    console.log('Message ID:', info.messageId);
    
  } catch (error) {
    console.error('❌ Email test failed:', error);
    console.error('Error details:', error.message);
  }
};

testEmailConfig();