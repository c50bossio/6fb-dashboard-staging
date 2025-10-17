#!/usr/bin/env node

/**
 * Script to send a test email with the new BookedBarber color theme
 * Uses the existing notification service infrastructure
 */

import { createClient } from '@supabase/supabase-js';
import sgMail from '@sendgrid/mail';
import dotenv from 'dotenv';
dotenv.config();

// Initialize SendGrid
sgMail.setApiKey(process.env.SENDGRID_API_KEY);

// Initialize services
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// BookedBarber Brand Colors
const bookedBarberColors = {
  primary: '#3C4A3E',     // Deep Olive (9.37:1 contrast with white)
  gold: '#B8913A',        // BookedBarber Gold
  goldLight: '#C5A35B',   // Rich Gold
  goldAccent: '#D4A94A',  // Lighter Gold
  text: '#1F2320',        // Gunmetal (15.91:1 contrast with white)
  textLight: '#4a4f4a',   // Medium gray (8.37:1 contrast with white)
  background: '#FFFFFF',
  backgroundLight: '#f8f9fa',
  backgroundSand: '#EAE3D2',  // Light Sand
  warning: '#6b5d16'      // Dark Amber (6.17:1 contrast with light bg)
};

async function sendThemeTestEmail() {
  console.log('📧 Sending BookedBarber theme test email...\n');
  
  // Create a custom HTML email showcasing the new theme
  const customHTML = `
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>BookedBarber New Theme Showcase</title>
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: ${bookedBarberColors.text}; margin: 0; padding: 0; background-color: ${bookedBarberColors.backgroundLight};">
    <div style="max-width: 600px; margin: 40px auto; background: ${bookedBarberColors.background}; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.07);">
        <!-- Header -->
        <div style="background: ${bookedBarberColors.primary}; color: white; padding: 40px 30px; text-align: center; position: relative;">
            <div style="position: absolute; top: 0; left: 0; right: 0; height: 4px; background: ${bookedBarberColors.gold};"></div>
            <h1 style="margin: 0; font-size: 28px; font-weight: 600;">✨ New BookedBarber Theme</h1>
            <p style="margin: 10px 0 0; opacity: 0.95; font-size: 16px; color: ${bookedBarberColors.goldLight};">Accessible • Professional • On-Brand</p>
        </div>
        
        <!-- Content -->
        <div style="padding: 40px 30px;">
            <h2 style="color: ${bookedBarberColors.primary}; margin-top: 0; font-size: 22px;">Hello Chris! 👋</h2>
            
            <p style="color: ${bookedBarberColors.textLight}; font-size: 16px; line-height: 1.6;">
                Great news! We've updated our email templates with a new accessible color theme that ensures all users can easily read our communications.
            </p>
            
            <!-- Key Improvements -->
            <div style="background: ${bookedBarberColors.backgroundSand}; border-left: 4px solid ${bookedBarberColors.gold}; padding: 20px; margin: 30px 0; border-radius: 4px;">
                <h3 style="margin: 0 0 15px; color: ${bookedBarberColors.primary}; font-size: 18px;">🎨 Key Improvements:</h3>
                <ul style="margin: 0; padding-left: 20px; color: ${bookedBarberColors.textLight};">
                    <li><strong>Better Contrast:</strong> All text now meets WCAG AA or AAA standards</li>
                    <li><strong>Brand Consistency:</strong> Using BookedBarber's signature Deep Olive & Gold</li>
                    <li><strong>Dual Branding:</strong> Platform emails use our colors, customer emails use shop colors</li>
                    <li><strong>Professional Look:</strong> Clean, modern design that works across all email clients</li>
                </ul>
            </div>
            
            <!-- Color Showcase -->
            <h3 style="color: ${bookedBarberColors.primary}; font-size: 18px; margin-top: 30px;">Color Palette & Contrast Ratios:</h3>
            
            <table style="width: 100%; border-collapse: collapse; margin-top: 15px;">
                <thead>
                    <tr style="background: ${bookedBarberColors.backgroundLight};">
                        <th style="text-align: left; padding: 12px; color: ${bookedBarberColors.text}; border-bottom: 2px solid ${bookedBarberColors.gold};">Element</th>
                        <th style="text-align: left; padding: 12px; color: ${bookedBarberColors.text}; border-bottom: 2px solid ${bookedBarberColors.gold};">Color</th>
                        <th style="text-align: left; padding: 12px; color: ${bookedBarberColors.text}; border-bottom: 2px solid ${bookedBarberColors.gold};">Contrast</th>
                        <th style="text-align: left; padding: 12px; color: ${bookedBarberColors.text}; border-bottom: 2px solid ${bookedBarberColors.gold};">WCAG</th>
                    </tr>
                </thead>
                <tbody>
                    <tr>
                        <td style="padding: 12px; border-bottom: 1px solid #eee;">Primary Button</td>
                        <td style="padding: 12px; border-bottom: 1px solid #eee;">
                            <span style="display: inline-block; width: 20px; height: 20px; background: ${bookedBarberColors.primary}; border-radius: 3px; vertical-align: middle;"></span>
                            #3C4A3E
                        </td>
                        <td style="padding: 12px; border-bottom: 1px solid #eee;">9.37:1</td>
                        <td style="padding: 12px; border-bottom: 1px solid #eee; color: #059669; font-weight: 600;">✅ AAA</td>
                    </tr>
                    <tr>
                        <td style="padding: 12px; border-bottom: 1px solid #eee;">Body Text</td>
                        <td style="padding: 12px; border-bottom: 1px solid #eee;">
                            <span style="display: inline-block; width: 20px; height: 20px; background: ${bookedBarberColors.text}; border-radius: 3px; vertical-align: middle;"></span>
                            #1F2320
                        </td>
                        <td style="padding: 12px; border-bottom: 1px solid #eee;">15.91:1</td>
                        <td style="padding: 12px; border-bottom: 1px solid #eee; color: #059669; font-weight: 600;">✅ AAA</td>
                    </tr>
                    <tr>
                        <td style="padding: 12px; border-bottom: 1px solid #eee;">Light Text</td>
                        <td style="padding: 12px; border-bottom: 1px solid #eee;">
                            <span style="display: inline-block; width: 20px; height: 20px; background: ${bookedBarberColors.textLight}; border-radius: 3px; vertical-align: middle;"></span>
                            #4a4f4a
                        </td>
                        <td style="padding: 12px; border-bottom: 1px solid #eee;">8.37:1</td>
                        <td style="padding: 12px; border-bottom: 1px solid #eee; color: #059669; font-weight: 600;">✅ AAA</td>
                    </tr>
                    <tr>
                        <td style="padding: 12px;">Warning Text</td>
                        <td style="padding: 12px;">
                            <span style="display: inline-block; width: 20px; height: 20px; background: ${bookedBarberColors.warning}; border-radius: 3px; vertical-align: middle;"></span>
                            #6b5d16
                        </td>
                        <td style="padding: 12px;">6.17:1</td>
                        <td style="padding: 12px; color: #059669; font-weight: 600;">✅ AA</td>
                    </tr>
                </tbody>
            </table>
            
            <!-- Button Examples -->
            <div style="text-align: center; margin: 40px 0;">
                <h3 style="color: ${bookedBarberColors.primary}; font-size: 16px; margin-bottom: 20px;">Button Styles:</h3>
                
                <a href="https://bookedbarber.com" style="display: inline-block; background: ${bookedBarberColors.primary}; color: white; padding: 14px 32px; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 16px; margin: 0 10px 10px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">Primary Action</a>
                
                <a href="https://bookedbarber.com" style="display: inline-block; background: ${bookedBarberColors.gold}; color: ${bookedBarberColors.primary}; padding: 14px 32px; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 16px; margin: 0 10px 10px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">Secondary Action</a>
            </div>
            
            <!-- Implementation Note -->
            <div style="background: #fff8e1; border: 1px solid ${bookedBarberColors.goldAccent}; padding: 15px; border-radius: 6px; margin-top: 30px;">
                <p style="margin: 0; color: ${bookedBarberColors.warning}; font-size: 14px;">
                    <strong>✅ Implementation Complete:</strong><br>
                    Staff invitations now use BookedBarber colors (shown here), while customer emails can use custom barbershop branding fetched from the database.
                </p>
            </div>
            
            <!-- Footer -->
            <div style="margin-top: 40px; padding-top: 20px; border-top: 1px solid #eee; text-align: center;">
                <p style="color: #999; font-size: 14px; margin: 0;">
                    This email demonstrates the new BookedBarber accessible color theme.
                </p>
                <p style="color: ${bookedBarberColors.goldAccent}; font-size: 14px; margin: 10px 0 0;">
                    <strong>BookedBarber</strong> • Professional Barbershop Management
                </p>
            </div>
        </div>
    </div>
</body>
</html>`;
  
  try {
    // Send using SendGrid directly
    const msg = {
      to: 'c50bossio@gmail.com',
      from: {
        email: process.env.SENDGRID_FROM_EMAIL || 'support@em3014.6fbmentorship.com',
        name: process.env.SENDGRID_FROM_NAME || 'BookedBarber'
      },
      subject: '🎨 BookedBarber New Accessible Color Theme',
      html: customHTML
    };
    
    await sgMail.send(msg);
    
    console.log('✅ Email sent successfully to c50bossio@gmail.com');
    console.log('\n📧 Email Details:');
    console.log('   Subject: 🎨 BookedBarber New Accessible Color Theme');
    console.log('   From:', process.env.SENDGRID_FROM_EMAIL);
    console.log('   To: c50bossio@gmail.com');
    console.log('\n🎨 Color Theme Applied:');
    console.log('   Primary (Deep Olive): #3C4A3E - 9.37:1 contrast');
    console.log('   Gold Accent: #B8913A');
    console.log('   Text (Gunmetal): #1F2320 - 15.91:1 contrast');
    console.log('   Warning (Dark Amber): #6b5d16 - 6.17:1 contrast');
    console.log('\n📬 Check your inbox for the theme showcase email!');
    
  } catch (error) {
    console.error('❌ Error sending email:', error.message);
    if (error.response) {
      console.error('SendGrid Error:', error.response.body);
    }
    console.log('\nTip: The SendGrid API key may be expired or invalid.');
    console.log('You can view the email template at: http://localhost:9999/api/test/send-theme-email');
  }
}

// Run the test
sendThemeTestEmail();