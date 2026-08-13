"""
Application entry point.

Starts the FastAPI + Gradio server with Uvicorn.

The FastAPI REST API stays at /api/*
The FastAPI docs stay at     /api/docs
"""
import uvicorn

from config import get_settings


def app():
    cfg = get_settings()
    uvicorn.run(
        "api:app",
        host=cfg.api_host,
        port=cfg.api_port,
        reload=cfg.api_reload,
        log_level=cfg.log_level.lower(),
    )


if __name__ == "__main__":
    app()
