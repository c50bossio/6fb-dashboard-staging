#!/usr/bin/env python3
"""
6FB AI Agent System API Package
FastAPI-based REST API for the multi-agent barbershop business intelligence system
"""

from .main import app
from .schemas import *
from .endpoints import get_router

__version__ = "1.0.0"
__all__ = ["app", "get_router"]