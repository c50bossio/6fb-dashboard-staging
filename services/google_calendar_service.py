#!/usr/bin/env python3
"""
Google Calendar Service Integration for 6FB AI Agent System
Provides real Google Calendar API integration for barbershop scheduling
"""

import httpx
import json
from typing import Dict, List, Optional, Any
from datetime import datetime, timedelta, timezone
import logging
from pydantic import BaseModel

logger = logging.getLogger(__name__)

class CalendarEvent(BaseModel):
    """Calendar event model"""
    id: str
    summary: str
    start: datetime
    end: datetime
    description: Optional[str] = None
    location: Optional[str] = None
    status: str = "confirmed"

class AvailabilitySlot(BaseModel):
    """Available time slot model"""
    start: datetime
    end: datetime
    duration_minutes: int

class GoogleCalendarService:
    """Google Calendar API service integration"""
    
    def __init__(self):
        self.base_url = "https://www.googleapis.com/calendar/v3"
        self.client = httpx.AsyncClient()
    
    async def get_calendar_info(self, access_token: str) -> Dict[str, Any]:
        """Get primary calendar information"""
        try:
            headers = {"Authorization": f"Bearer {access_token}"}
            
            # Get primary calendar
            response = await self.client.get(
                f"{self.base_url}/calendars/primary",
                headers=headers
            )
            
            if response.status_code == 200:
                calendar_data = response.json()
                return {
                    "success": True,
                    "calendar_id": calendar_data.get("id"),
                    "calendar_name": calendar_data.get("summary", "Primary Calendar"),
                    "timezone": calendar_data.get("timeZone", "UTC")
                }
            else:
                logger.error(f"Failed to get calendar info: {response.status_code} - {response.text}")
                return {
                    "success": False,
                    "error": f"Calendar API error: {response.status_code}"
                }
                
        except Exception as e:
            logger.error(f"Error getting calendar info: {e}")
            return {
                "success": False,
                "error": str(e)
            }
    
    async def get_busy_times(self, access_token: str, calendar_id: str, 
                           start_time: datetime, end_time: datetime) -> List[Dict[str, datetime]]:
        """Get busy time slots from Google Calendar"""
        try:
            headers = {
                "Authorization": f"Bearer {access_token}",
                "Content-Type": "application/json"
            }
            
            # Format times for Google Calendar API
            time_min = start_time.isoformat()
            time_max = end_time.isoformat()
            
            # Use freebusy API for efficient busy time detection
            freebusy_request = {
                "timeMin": time_min,
                "timeMax": time_max,
                "items": [{"id": calendar_id}]
            }
            
            response = await self.client.post(
                f"{self.base_url}/freebusy",
                headers=headers,
                json=freebusy_request
            )
            
            if response.status_code == 200:
                data = response.json()
                calendar_data = data.get("calendars", {}).get(calendar_id, {})
                busy_times = calendar_data.get("busy", [])
                
                # Convert to datetime objects
                busy_slots = []
                for busy_slot in busy_times:
                    busy_slots.append({
                        "start": datetime.fromisoformat(busy_slot["start"].replace("Z", "+00:00")),
                        "end": datetime.fromisoformat(busy_slot["end"].replace("Z", "+00:00"))
                    })
                
                return busy_slots
            
            else:
                logger.error(f"Failed to get busy times: {response.status_code} - {response.text}")
                return []
                
        except Exception as e:
            logger.error(f"Error getting busy times: {e}")
            return []
    
    async def get_available_slots(self, access_token: str, calendar_id: str,
                                start_date: datetime, end_date: datetime,
                                slot_duration_minutes: int = 30,
                                business_hours_start: int = 9,  # 9 AM
                                business_hours_end: int = 18,   # 6 PM
                                excluded_days: List[int] = None) -> List[AvailabilitySlot]:
        """Generate available time slots based on calendar busy times"""
        
        if excluded_days is None:
            excluded_days = [6]  # Sunday by default
        
        try:
            # Get busy times from Google Calendar
            busy_times = await self.get_busy_times(access_token, calendar_id, start_date, end_date)
            
            available_slots = []
            current_date = start_date
            
            while current_date < end_date:
                # Skip excluded days (0=Monday, 6=Sunday)
                if current_date.weekday() in excluded_days:
                    current_date += timedelta(days=1)
                    continue
                
                # Generate business hour slots for this day
                day_start = current_date.replace(hour=business_hours_start, minute=0, second=0, microsecond=0)
                day_end = current_date.replace(hour=business_hours_end, minute=0, second=0, microsecond=0)
                
                # Generate time slots
                slot_start = day_start
                while slot_start + timedelta(minutes=slot_duration_minutes) <= day_end:
                    slot_end = slot_start + timedelta(minutes=slot_duration_minutes)
                    
                    # Check if this slot conflicts with any busy time
                    is_available = True
                    for busy_slot in busy_times:
                        if (slot_start < busy_slot["end"] and slot_end > busy_slot["start"]):
                            is_available = False
                            break
                    
                    # Skip past slots
                    if slot_start <= datetime.now(timezone.utc):
                        is_available = False
                    
                    if is_available:
                        available_slots.append(AvailabilitySlot(
                            start=slot_start,
                            end=slot_end,
                            duration_minutes=slot_duration_minutes
                        ))
                    
                    slot_start = slot_end
                
                current_date += timedelta(days=1)
            
            return available_slots
            
        except Exception as e:
            logger.error(f"Error generating available slots: {e}")
            return []
    
    async def create_calendar_event(self, access_token: str, calendar_id: str,
                                  event_data: Dict[str, Any]) -> Dict[str, Any]:
        """Create a new calendar event"""
        try:
            headers = {
                "Authorization": f"Bearer {access_token}",
                "Content-Type": "application/json"
            }
            
            # Create Google Calendar event format
            calendar_event = {
                "summary": event_data.get("title", "Barbershop Appointment"),
                "description": event_data.get("description", ""),
                "start": {
                    "dateTime": event_data["start_time"],
                    "timeZone": event_data.get("timezone", "UTC")
                },
                "end": {
                    "dateTime": event_data["end_time"],
                    "timeZone": event_data.get("timezone", "UTC")
                },
                "attendees": event_data.get("attendees", []),
                "reminders": {
                    "useDefault": False,
                    "overrides": [
                        {"method": "email", "minutes": 24 * 60},  # 24 hours
                        {"method": "popup", "minutes": 30}        # 30 minutes
                    ]
                }
            }
            
            if event_data.get("location"):
                calendar_event["location"] = event_data["location"]
            
            response = await self.client.post(
                f"{self.base_url}/calendars/{calendar_id}/events",
                headers=headers,
                json=calendar_event
            )
            
            if response.status_code == 200:
                event = response.json()
                return {
                    "success": True,
                    "event_id": event["id"],
                    "event_link": event.get("htmlLink"),
                    "event": event
                }
            else:
                logger.error(f"Failed to create calendar event: {response.status_code} - {response.text}")
                return {
                    "success": False,
                    "error": f"Calendar API error: {response.status_code}"
                }
                
        except Exception as e:
            logger.error(f"Error creating calendar event: {e}")
            return {
                "success": False,
                "error": str(e)
            }
    
    async def update_calendar_event(self, access_token: str, calendar_id: str,
                                  event_id: str, event_data: Dict[str, Any]) -> Dict[str, Any]:
        """Update an existing calendar event"""
        try:
            headers = {
                "Authorization": f"Bearer {access_token}",
                "Content-Type": "application/json"
            }
            
            # Get existing event first
            get_response = await self.client.get(
                f"{self.base_url}/calendars/{calendar_id}/events/{event_id}",
                headers=headers
            )
            
            if get_response.status_code != 200:
                return {
                    "success": False,
                    "error": "Event not found"
                }
            
            existing_event = get_response.json()
            
            # Update fields
            if "title" in event_data:
                existing_event["summary"] = event_data["title"]
            if "description" in event_data:
                existing_event["description"] = event_data["description"]
            if "start_time" in event_data:
                existing_event["start"]["dateTime"] = event_data["start_time"]
            if "end_time" in event_data:
                existing_event["end"]["dateTime"] = event_data["end_time"]
            if "location" in event_data:
                existing_event["location"] = event_data["location"]
            
            # Update the event
            response = await self.client.put(
                f"{self.base_url}/calendars/{calendar_id}/events/{event_id}",
                headers=headers,
                json=existing_event
            )
            
            if response.status_code == 200:
                event = response.json()
                return {
                    "success": True,
                    "event_id": event["id"],
                    "event": event
                }
            else:
                logger.error(f"Failed to update calendar event: {response.status_code} - {response.text}")
                return {
                    "success": False,
                    "error": f"Calendar API error: {response.status_code}"
                }
                
        except Exception as e:
            logger.error(f"Error updating calendar event: {e}")
            return {
                "success": False,
                "error": str(e)
            }
    
    async def delete_calendar_event(self, access_token: str, calendar_id: str,
                                  event_id: str) -> Dict[str, Any]:
        """Delete a calendar event"""
        try:
            headers = {"Authorization": f"Bearer {access_token}"}
            
            response = await self.client.delete(
                f"{self.base_url}/calendars/{calendar_id}/events/{event_id}",
                headers=headers
            )
            
            if response.status_code == 204:
                return {"success": True}
            else:
                logger.error(f"Failed to delete calendar event: {response.status_code} - {response.text}")
                return {
                    "success": False,
                    "error": f"Calendar API error: {response.status_code}"
                }
                
        except Exception as e:
            logger.error(f"Error deleting calendar event: {e}")
            return {
                "success": False,
                "error": str(e)
            }
    
    async def refresh_access_token(self, refresh_token: str, client_id: str, 
                                 client_secret: str) -> Dict[str, Any]:
        """Refresh Google OAuth access token"""
        try:
            token_data = {
                "grant_type": "refresh_token",
                "refresh_token": refresh_token,
                "client_id": client_id,
                "client_secret": client_secret
            }
            
            response = await self.client.post(
                "https://oauth2.googleapis.com/token",
                data=token_data
            )
            
            if response.status_code == 200:
                token_response = response.json()
                return {
                    "success": True,
                    "access_token": token_response["access_token"],
                    "expires_in": token_response.get("expires_in", 3600),
                    "refresh_token": token_response.get("refresh_token", refresh_token)
                }
            else:
                logger.error(f"Failed to refresh token: {response.status_code} - {response.text}")
                return {
                    "success": False,
                    "error": f"Token refresh failed: {response.status_code}"
                }
                
        except Exception as e:
            logger.error(f"Error refreshing token: {e}")
            return {
                "success": False,
                "error": str(e)
            }
    
    async def close(self):
        """Close the HTTP client"""
        await self.client.aclose()

# Global service instance
_google_calendar_service: Optional[GoogleCalendarService] = None

def get_google_calendar_service() -> GoogleCalendarService:
    """Get or create Google Calendar service instance"""
    global _google_calendar_service
    if _google_calendar_service is None:
        _google_calendar_service = GoogleCalendarService()
    return _google_calendar_service