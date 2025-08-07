/**
 * Appointment Confirmation Email Template
 * Professional React Email template for appointment confirmations
 */

export function renderAppointmentConfirmationEmail(payload) {
  const {
    customerName,
    appointmentDate,
    appointmentTime,
    serviceName,
    barberName,
    shopName,
    shopAddress,
    shopPhone,
    totalPrice,
    confirmationNumber,
    shopLogo,
    primaryColor = '#3B82F6',
    cancelUrl
  } = payload;

  return `
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Appointment Confirmed</title>
    <style>
        body { 
            font-family: Arial, sans-serif; 
            line-height: 1.6; 
            color: #333; 
            margin: 0; 
            padding: 0;
            background-color: #f8f9fa;
        }
        .container { 
            max-width: 600px; 
            margin: 0 auto; 
            background: white; 
            border-radius: 8px;
            overflow: hidden;
            box-shadow: 0 4px 6px rgba(0,0,0,0.1);
        }
        .header { 
            background: ${primaryColor}; 
            color: white; 
            padding: 30px 20px; 
            text-align: center;
        }
        .logo { 
            max-width: 120px; 
            height: auto; 
            margin-bottom: 10px;
        }
        .content { 
            padding: 30px 20px;
        }
        .appointment-card {
            background: #f8f9fa;
            border-left: 4px solid ${primaryColor};
            padding: 20px;
            margin: 20px 0;
            border-radius: 4px;
        }
        .detail-row {
            display: flex;
            justify-content: space-between;
            margin: 10px 0;
            padding: 8px 0;
            border-bottom: 1px solid #eee;
        }
        .detail-label {
            font-weight: bold;
            color: #555;
        }
        .detail-value {
            color: #333;
        }
        .cta-button {
            display: inline-block;
            background: ${primaryColor};
            color: white;
            padding: 12px 24px;
            text-decoration: none;
            border-radius: 6px;
            font-weight: bold;
            margin: 20px 10px 0 0;
        }
        .secondary-button {
            display: inline-block;
            background: transparent;
            color: ${primaryColor};
            border: 2px solid ${primaryColor};
            padding: 10px 22px;
            text-decoration: none;
            border-radius: 6px;
            font-weight: bold;
            margin: 20px 0 0 0;
        }
        .footer {
            background: #f8f9fa;
            padding: 20px;
            text-align: center;
            color: #666;
            font-size: 14px;
        }
        .confirmation-badge {
            background: #10B981;
            color: white;
            padding: 4px 12px;
            border-radius: 20px;
            font-size: 12px;
            font-weight: bold;
        }
        @media (max-width: 600px) {
            .container { margin: 10px; }
            .content { padding: 20px 15px; }
            .cta-button, .secondary-button { 
                display: block; 
                text-align: center; 
                margin: 10px 0; 
            }
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            ${shopLogo ? `<img src="${shopLogo}" alt="${shopName}" class="logo">` : ''}
            <h1>Appointment Confirmed!</h1>
            <span class="confirmation-badge">✓ CONFIRMED</span>
        </div>
        
        <div class="content">
            <h2>Hi ${customerName},</h2>
            <p>Great news! Your appointment has been successfully confirmed. Here are your appointment details:</p>
            
            <div class="appointment-card">
                <div class="detail-row">
                    <span class="detail-label">Service:</span>
                    <span class="detail-value">${serviceName}</span>
                </div>
                <div class="detail-row">
                    <span class="detail-label">Date & Time:</span>
                    <span class="detail-value">${appointmentDate} at ${appointmentTime}</span>
                </div>
                <div class="detail-row">
                    <span class="detail-label">Barber:</span>
                    <span class="detail-value">${barberName}</span>
                </div>
                <div class="detail-row">
                    <span class="detail-label">Location:</span>
                    <span class="detail-value">${shopName}</span>
                </div>
                <div class="detail-row">
                    <span class="detail-label">Address:</span>
                    <span class="detail-value">${shopAddress}</span>
                </div>
                <div class="detail-row">
                    <span class="detail-label">Phone:</span>
                    <span class="detail-value">${shopPhone}</span>
                </div>
                <div class="detail-row">
                    <span class="detail-label">Total Price:</span>
                    <span class="detail-value">${totalPrice}</span>
                </div>
                <div class="detail-row">
                    <span class="detail-label">Confirmation #:</span>
                    <span class="detail-value">${confirmationNumber}</span>
                </div>
            </div>
            
            <p><strong>What to expect:</strong></p>
            <ul>
                <li>Please arrive 5-10 minutes early</li>
                <li>Bring a valid ID if it's your first visit</li>
                <li>We'll send you a reminder 24 hours before your appointment</li>
            </ul>
            
            <div style="text-align: center; margin: 30px 0;">
                <a href="tel:${shopPhone}" class="cta-button">Call Shop</a>
                ${cancelUrl ? `<a href="${cancelUrl}" class="secondary-button">Manage Booking</a>` : ''}
            </div>
        </div>
        
        <div class="footer">
            <p>Need to make changes? Call us at ${shopPhone}</p>
            <p>Thank you for choosing ${shopName}!</p>
        </div>
    </div>
</body>
</html>`;
}