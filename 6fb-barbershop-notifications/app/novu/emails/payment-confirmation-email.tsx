import {
  Body,
  Container,
  Head,
  Html,
  Img,
  Link,
  Preview,
  Section,
  Text,
} from "@react-email/components";
import { render } from "@react-email/render";
import { EmailControls, Payload } from "../workflows/payment-confirmation/types";

interface PaymentConfirmationEmailProps {
  controls: EmailControls;
  payload: Payload;
}

export function PaymentConfirmationEmail({
  controls,
  payload,
}: PaymentConfirmationEmailProps) {
  const previewText = `Payment confirmed: ${payload.paymentAmount} for ${payload.serviceName}`;

  return (
    <Html>
      <Head />
      <Preview>{previewText}</Preview>
      <Body style={main}>
        <Container style={container}>
          {controls.shopLogo && (
            <Section style={logoSection}>
              <Img
                src={controls.shopLogo}
                width="150"
                height="50"
                alt={payload.shopName}
                style={logo}
              />
            </Section>
          )}
          
          <Section style={header}>
            <Text style={heading}>Payment Confirmed! ✅</Text>
          </Section>

          <Section style={content}>
            <Text style={greeting}>Hi {payload.customerName},</Text>
            <Text style={paragraph}>
              Thank you! Your payment has been successfully processed.
            </Text>

            <Section style={paymentDetails}>
              <Text style={detailLabel}>Amount Paid:</Text>
              <Text style={amountValue}>{payload.paymentAmount}</Text>
              
              <Text style={detailLabel}>Service:</Text>
              <Text style={detailValue}>{payload.serviceName}</Text>
              
              <Text style={detailLabel}>Payment Method:</Text>
              <Text style={detailValue}>{payload.paymentMethod}</Text>
              
              <Text style={detailLabel}>Transaction ID:</Text>
              <Text style={detailValue}>{payload.transactionId}</Text>
              
              {payload.appointmentDate && payload.appointmentTime && (
                <>
                  <Text style={detailLabel}>Appointment:</Text>
                  <Text style={detailValue}>
                    {payload.appointmentDate} at {payload.appointmentTime}
                  </Text>
                </>
              )}
            </Section>

            <Text style={paragraph}>
              Your payment has been securely processed and you'll receive this confirmation 
              at {payload.customerEmail}.
            </Text>

            {controls.showReceiptLink && payload.receiptUrl && (
              <Section style={receiptSection}>
                <Link href={payload.receiptUrl} style={receiptButton}>
                  Download Receipt 📄
                </Link>
              </Section>
            )}

            <Text style={paragraph}>
              If you have any questions about your payment, please contact {payload.shopName} 
              or reference transaction ID: {payload.transactionId}
            </Text>
          </Section>

          <Section style={footer}>
            <Text style={footerText}>
              Thank you for choosing {payload.shopName}!<br />
              We appreciate your business.
            </Text>
          </Section>
        </Container>
      </Body>
    </Html>
  );
}

export function renderPaymentConfirmationEmail(
  controls: EmailControls,
  payload: Payload
) {
  return render(<PaymentConfirmationEmail controls={controls} payload={payload} />);
}

// Styles
const main = {
  backgroundColor: "#f6f9fc",
  fontFamily: '"Segoe UI", Roboto, Arial, sans-serif',
};

const container = {
  backgroundColor: "#ffffff",
  margin: "0 auto",
  padding: "20px 0 48px",
  marginBottom: "64px",
  maxWidth: "600px",
};

const logoSection = {
  padding: "20px 40px",
  textAlign: "center" as const,
};

const logo = {
  margin: "0 auto",
};

const header = {
  padding: "0 40px 20px",
  textAlign: "center" as const,
};

const heading = {
  fontSize: "28px",
  fontWeight: "bold",
  color: "#10B981",
  margin: "0",
};

const content = {
  padding: "0 40px",
};

const greeting = {
  fontSize: "18px",
  fontWeight: "600",
  color: "#333333",
  margin: "0 0 16px",
};

const paragraph = {
  fontSize: "16px",
  lineHeight: "26px",
  color: "#555555",
  margin: "0 0 16px",
};

const paymentDetails = {
  backgroundColor: "#f0fdf4",
  border: "1px solid #10B981",
  borderRadius: "8px",
  padding: "20px",
  margin: "24px 0",
};

const detailLabel = {
  fontSize: "14px",
  fontWeight: "600",
  color: "#374151",
  margin: "0 0 4px",
};

const detailValue = {
  fontSize: "16px",
  color: "#111827",
  margin: "0 0 16px",
};

const amountValue = {
  fontSize: "24px",
  fontWeight: "bold",
  color: "#10B981",
  margin: "0 0 16px",
};

const receiptSection = {
  textAlign: "center" as const,
  margin: "32px 0",
};

const receiptButton = {
  backgroundColor: "#10B981",
  color: "#ffffff",
  padding: "12px 24px",
  borderRadius: "6px",
  textDecoration: "none",
  fontWeight: "600",
  display: "inline-block",
};

const footer = {
  padding: "32px 40px 0",
  borderTop: "1px solid #e5e7eb",
  marginTop: "32px",
};

const footerText = {
  fontSize: "14px",
  color: "#6b7280",
  lineHeight: "24px",
  textAlign: "center" as const,
};