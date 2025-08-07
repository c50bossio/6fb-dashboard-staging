/**
 * Payment Confirmation Email Template
 * Professional React Email template for payment confirmations
 */

export function renderPaymentConfirmationEmail(payload) {
  const {
    customerName,
    customerEmail,
    paymentAmount,
    paymentMethod,
    transactionId,
    serviceName,
    appointmentDate,
    appointmentTime,
    shopName,
    receiptUrl,
    shopLogo,
    primaryColor = '#10B981',
    shopAddress,
    shopPhone
  } = payload;

  return `
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Payment Confirmed</title>
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
        .payment-card {
            background: linear-gradient(135deg, ${primaryColor}22, ${primaryColor}11);
            border-left: 4px solid ${primaryColor};
            padding: 20px;
            margin: 20px 0;
            border-radius: 4px;
        }
        .amount-display {
            text-align: center;
            background: ${primaryColor};
            color: white;
            padding: 20px;
            border-radius: 8px;
            margin: 20px 0;
        }
        .amount-number {
            font-size: 36px;
            font-weight: bold;
            display: block;
        }
        .amount-label {
            font-size: 14px;
            opacity: 0.9;
            margin-top: 5px;
        }
        .transaction-details {
            background: #f8f9fa;
            padding: 20px;
            border-radius: 6px;
            margin: 20px 0;
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
        .transaction-id {
            font-family: 'Courier New', monospace;
            background: #f1f5f9;
            padding: 8px;
            border-radius: 4px;
            font-size: 12px;
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
        .success-badge {
            background: ${primaryColor};
            color: white;
            padding: 4px 12px;
            border-radius: 20px;
            font-size: 12px;
            font-weight: bold;
        }
        .security-notice {
            background: #f0f9ff;
            border-left: 4px solid #3B82F6;
            padding: 15px;
            margin: 20px 0;
            border-radius: 4px;
            font-size: 14px;
        }
        @media (max-width: 600px) {
            .container { margin: 10px; }
            .content { padding: 20px 15px; }
            .cta-button, .secondary-button { 
                display: block; 
                text-align: center; 
                margin: 10px 0; 
            }
            .amount-number { font-size: 28px; }
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            ${shopLogo ? `<img src="${shopLogo}" alt="${shopName}" class="logo">` : ''}
            <h1>✅ Payment Confirmed!</h1>
            <span class="success-badge">PAID</span>
        </div>
        
        <div class="content">
            <h2>Hi ${customerName},</h2>
            <p>Great news! Your payment has been successfully processed. Here's your receipt:</p>
            
            <div class="amount-display">
                <span class="amount-number">${paymentAmount}</span>
                <div class="amount-label">Payment Confirmed</div>
            </div>
            
            <div class="transaction-details">
                <h3>Transaction Details</h3>
                <div class="detail-row">
                    <span class="detail-label">Transaction ID:</span>
                    <span class="detail-value transaction-id">${transactionId}</span>
                </div>
                <div class="detail-row">
                    <span class="detail-label">Payment Method:</span>
                    <span class="detail-value">${paymentMethod}</span>
                </div>
                <div class="detail-row">
                    <span class="detail-label">Customer:</span>
                    <span class="detail-value">${customerName}</span>
                </div>
                <div class="detail-row">
                    <span class="detail-label">Email:</span>
                    <span class="detail-value">${customerEmail}</span>
                </div>
            </div>
            
            <div class="payment-card">
                <h3>Service Details</h3>
                <div class="detail-row">
                    <span class="detail-label">Service:</span>
                    <span class="detail-value">${serviceName}</span>
                </div>
                <div class="detail-row">
                    <span class="detail-label">Date & Time:</span>
                    <span class="detail-value">${appointmentDate} at ${appointmentTime}</span>
                </div>
                <div class="detail-row">
                    <span class="detail-label">Business:</span>
                    <span class="detail-value">${shopName}</span>
                </div>
                ${shopAddress ? `<div class="detail-row">
                    <span class="detail-label">Location:</span>
                    <span class="detail-value">${shopAddress}</span>
                </div>` : ''}
                ${shopPhone ? `<div class="detail-row">
                    <span class="detail-label">Phone:</span>
                    <span class="detail-value">${shopPhone}</span>
                </div>` : ''}
            </div>
            
            <div class="security-notice">
                <h4>🔒 Payment Security</h4>
                <p>Your payment was processed securely. This transaction will appear on your statement as "${shopName}" or similar. Keep this email as your receipt for your records.</p>
            </div>
            
            <div style="text-align: center; margin: 30px 0;">
                ${receiptUrl ? `<a href="${receiptUrl}" class="cta-button">Download Receipt</a>` : ''}
                ${shopPhone ? `<a href="tel:${shopPhone}" class="secondary-button">Contact Shop</a>` : ''}
            </div>
            
            <p><strong>What's Next?</strong></p>
            <ul>
                <li>You'll receive a reminder 24 hours before your appointment</li>
                <li>Please arrive 5-10 minutes early for your appointment</li>
                <li>Contact us if you need to make any changes</li>
            </ul>
        </div>
        
        <div class="footer">
            <p>Questions about your payment? Contact us at ${shopPhone || customerEmail}</p>
            <p>Thank you for choosing ${shopName}!</p>
            <p style="margin-top: 20px; font-size: 12px; color: #999;">
                Transaction ID: ${transactionId}<br>
                This email serves as your official receipt.
            </p>
        </div>
    </div>
</body>
</html>`;
}