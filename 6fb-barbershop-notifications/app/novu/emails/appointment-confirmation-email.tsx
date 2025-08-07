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
import { EmailControls, Payload } from "../workflows/appointment-confirmation/types";

interface AppointmentConfirmationEmailProps {
  controls: EmailControls;
  payload: Payload;
}

export function AppointmentConfirmationEmail({
  controls,
  payload,
}: AppointmentConfirmationEmailProps) {
  const previewText = `Your ${payload.serviceName} appointment is confirmed!`;

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
            <Text style={heading}>Appointment Confirmed! ✅</Text>
          </Section>

          <Section style={content}>
            <Text style={greeting}>Hi {payload.customerName},</Text>
            <Text style={paragraph}>
              Great news! Your appointment has been confirmed. Here are the details:
            </Text>

            <Section style={appointmentDetails}>
              <Text style={detailLabel}>Service:</Text>
              <Text style={detailValue}>{payload.serviceName}</Text>
              
              <Text style={detailLabel}>Date & Time:</Text>
              <Text style={detailValue}>
                {payload.appointmentDate} at {payload.appointmentTime}
              </Text>
              
              <Text style={detailLabel}>Barber:</Text>
              <Text style={detailValue}>{payload.barberName}</Text>
              
              <Text style={detailLabel}>Location:</Text>
              <Text style={detailValue}>
                {payload.shopName}<br />
                {payload.shopAddress}
              </Text>
              
              <Text style={detailLabel}>Total Price:</Text>
              <Text style={detailValue}>{payload.totalPrice}</Text>
              
              <Text style={detailLabel}>Confirmation Number:</Text>
              <Text style={detailValue}>{payload.confirmationNumber}</Text>
            </Section>

            <Text style={paragraph}>
              We look forward to seeing you! If you have any questions, please call us at {payload.shopPhone}.
            </Text>

            {controls.showCancellationLink && (
              <Text style={paragraph}>
                Need to cancel or reschedule?{" "}
                <Link href="#" style={link}>Click here to manage your appointment</Link>
              </Text>
            )}
          </Section>

          <Section style={footer}>
            <Text style={footerText}>
              Best regards,<br />
              The {payload.shopName} Team
            </Text>
          </Section>
        </Container>
      </Body>
    </Html>
  );
}

export function renderAppointmentConfirmationEmail(
  controls: EmailControls,
  payload: Payload
) {
  return render(<AppointmentConfirmationEmail controls={controls} payload={payload} />);
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
  color: "#3B82F6",
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

const appointmentDetails = {
  backgroundColor: "#f8fafc",
  border: "1px solid #e5e7eb",
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

const link = {
  color: "#3B82F6",
  textDecoration: "underline",
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
};