/**
 * Booking Reminder Email Template
 * Professional React Email template for appointment reminders
 */

export function renderBookingReminderEmail(payload) {
  const {
    customerName,
    appointmentDate,
    appointmentTime,
    serviceName,
    barberName,
    shopName,
    shopAddress,
    shopPhone,
    confirmationNumber,
    hoursUntilAppointment,
    shopLogo,
    primaryColor = '#F59E0B',
    manageUrl
  } = payload;

  const timeContext = hoursUntilAppointment <= 24 ? 'tomorrow' : 
                     hoursUntilAppointment <= 48 ? 'in 2 days' : 
                     'soon';

  const urgencyColor = hoursUntilAppointment <= 4 ? '#EF4444' : 
                      hoursUntilAppointment <= 24 ? '#F59E0B' : 
                      '#3B82F6';

  return `
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Appointment Reminder</title>
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
            background: ${urgencyColor}; 
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
        .reminder-card {
            background: linear-gradient(135deg, ${urgencyColor}22, ${urgencyColor}11);
            border-left: 4px solid ${urgencyColor};
            padding: 20px;
            margin: 20px 0;
            border-radius: 4px;
        }
        .countdown {
            text-align: center;
            background: ${urgencyColor};
            color: white;
            padding: 15px;
            border-radius: 6px;
            margin: 20px 0;
        }
        .countdown-number {
            font-size: 32px;
            font-weight: bold;
            display: block;
        }
        .countdown-label {
            font-size: 14px;
            opacity: 0.9;
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
            background: ${urgencyColor};
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
            color: ${urgencyColor};
            border: 2px solid ${urgencyColor};
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
        .reminder-badge {
            background: ${urgencyColor};
            color: white;
            padding: 4px 12px;
            border-radius: 20px;
            font-size: 12px;
            font-weight: bold;
        }
        .preparation-tips {
            background: #f0f9ff;
            border-left: 4px solid #3B82F6;
            padding: 15px;
            margin: 20px 0;
            border-radius: 4px;
        }
        @media (max-width: 600px) {
            .container { margin: 10px; }
            .content { padding: 20px 15px; }
            .cta-button, .secondary-button { 
                display: block; 
                text-align: center; 
                margin: 10px 0; 
            }
            .countdown-number { font-size: 24px; }
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            ${shopLogo ? `<img src="${shopLogo}" alt="${shopName}" class="logo">` : ''}
            <h1>⏰ Appointment Reminder</h1>
            <span class="reminder-badge">REMINDER</span>
        </div>
        
        <div class="content">
            <h2>Hi ${customerName},</h2>
            <p>This is a friendly reminder about your upcoming appointment ${timeContext}!</p>
            
            <div class="countdown">
                <span class="countdown-number">${hoursUntilAppointment}</span>
                <span class="countdown-label">hours until your appointment</span>
            </div>
            
            <div class="reminder-card">
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
                    <span class="detail-label">Confirmation #:</span>
                    <span class="detail-value">${confirmationNumber}</span>
                </div>
            </div>
            
            <div class="preparation-tips">
                <h3>💡 Quick Reminders:</h3>
                <ul>
                    <li><strong>Arrive early:</strong> Please arrive 5-10 minutes before your appointment</li>
                    <li><strong>Parking:</strong> Street parking or nearby lots available</li>
                    <li><strong>Payment:</strong> We accept cash, cards, and mobile payments</li>
                    ${hoursUntilAppointment <= 4 ? '<li><strong>Running late?</strong> Please call us as soon as possible</li>' : ''}
                </ul>
            </div>
            
            <div style="text-align: center; margin: 30px 0;">
                <a href="tel:${shopPhone}" class="cta-button">Call Shop</a>
                ${manageUrl ? `<a href="${manageUrl}" class="secondary-button">Manage Booking</a>` : ''}
            </div>
            
            ${hoursUntilAppointment <= 2 ? 
                `<div style="background: #FEF2F2; border: 1px solid #FECACA; padding: 15px; border-radius: 6px; margin: 20px 0; text-align: center;">
                    <strong>⚠️ Your appointment is in ${hoursUntilAppointment} ${hoursUntilAppointment === 1 ? 'hour' : 'hours'}!</strong><br>
                    Don't forget - we're looking forward to seeing you soon!
                </div>` : ''
            }
        </div>
        
        <div class="footer">
            <p>Need to reschedule or cancel? Call us at ${shopPhone}</p>
            <p>See you soon at ${shopName}!</p>
        </div>
    </div>
</body>
</html>`;
}