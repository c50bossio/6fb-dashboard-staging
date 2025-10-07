#!/usr/bin/env python3
"""
6FB AI Agent System API Package
FastAPI-based REST API for the multi-agent barbershop business intelligence system
"""

__version__ = "1.0.0"

# Lazy imports to avoid circular dependencies and allow submodule imports
__all__ = ["app", "get_router"]

def __getattr__(name):
    """Lazy import to avoid loading main.py when importing submodules"""
    if name == "app":
        from .main import app
        return app
    elif name == "get_router":
        from .endpoints import get_router
        return get_router
    raise AttributeError(f"module {__name__!r} has no attribute {name!r}")