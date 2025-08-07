#!/usr/bin/env python3
import asyncio
import json
from playwright.async_api import async_playwright

async def debug_login_page():
    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=False)
        context = await browser.new_context()
        page = await context.new_page()
        
        # Collect console messages
        console_messages = []
        def handle_console(msg):
            console_messages.append({
                'type': msg.type,
                'text': msg.text,
                'location': msg.location if hasattr(msg, 'location') else None
            })
        page.on('console', handle_console)
        
        # Collect errors
        errors = []
        def handle_error(error):
            errors.append(str(error))
        page.on('pageerror', handle_error)
        
        try:
            print('🔍 Navigating to login page...')
            await page.goto('http://localhost:9999/login', wait_until='networkidle')
            
            # Wait a bit for all debugging logs to appear
            await page.wait_for_timeout(5000)
            
            print('📸 Taking screenshot...')
            await page.screenshot(path='login_debug_screenshot.png')
            
            print('🔍 Checking form state...')
            # Check if form elements are enabled
            email_input = page.locator('input[type="email"]')
            password_input = page.locator('input[type="password"]')
            submit_button = page.locator('button[type="submit"]')
            
            email_count = await email_input.count()
            password_count = await password_input.count()
            button_count = await submit_button.count()
            
            email_disabled = await email_input.is_disabled() if email_count > 0 else 'NOT_FOUND'
            password_disabled = await password_input.is_disabled() if password_count > 0 else 'NOT_FOUND'
            button_text = await submit_button.text_content() if button_count > 0 else 'NOT_FOUND'
            button_disabled = await submit_button.is_disabled() if button_count > 0 else 'NOT_FOUND'
            
            print(f'📋 Form State:')
            print(f'  Email input found: {email_count > 0}, disabled: {email_disabled}')
            print(f'  Password input found: {password_count > 0}, disabled: {password_disabled}')
            print(f'  Button found: {button_count > 0}, text: "{button_text}", disabled: {button_disabled}')
            
            # Try to get background colors to check if inputs are grayed out
            if email_count > 0:
                email_bg = await email_input.evaluate('el => getComputedStyle(el).backgroundColor')
                print(f'  Email input background: {email_bg}')
            
            if password_count > 0:
                password_bg = await password_input.evaluate('el => getComputedStyle(el).backgroundColor')
                print(f'  Password input background: {password_bg}')
            
        except Exception as e:
            print(f'❌ Error during debugging: {e}')
        
        print('\n📝 All Console Messages:')
        for msg in console_messages:
            print(f'  [{msg["type"].upper()}] {msg["text"]}')
        
        print('\n🔥 DEBUG Messages (Filtered):')
        for msg in console_messages:
            if '🔥' in msg['text'] or 'LOGIN' in msg['text'].upper() or 'auth' in msg['text'].lower():
                print(f'  [{msg["type"].upper()}] {msg["text"]}')
        
        print('\n❌ Page Errors:')
        for error in errors:
            print(f'  {error}')
        
        await browser.close()

if __name__ == "__main__":
    asyncio.run(debug_login_page())