# syntax=docker/dockerfile:1
FROM python:3.12-slim-bookworm

# Copy high-performance uv binary from official Astral image
COPY --from=ghcr.io/astral-sh/uv:latest /uv /uvx /bin/

# Configure uv and Debian for maximum container installation speed
ENV UV_COMPILE_BYTECODE=1 \
    UV_LINK_MODE=copy \
    UV_SYSTEM_PYTHON=1 \
    DEBIAN_FRONTEND=noninteractive

# Install Node.js & npm with BuildKit cache mounts to provide configurable-http-proxy
RUN --mount=type=cache,target=/var/cache/apt,sharing=locked \
    --mount=type=cache,target=/var/lib/apt,sharing=locked \
    apt-get update && apt-get install -y --no-install-recommends \
    nodejs \
    npm \
    && rm -rf /var/lib/apt/lists/*

RUN --mount=type=cache,target=/root/.npm \
    npm install -g configurable-http-proxy

# Install JupyterHub, JupyterLab and computational libraries via uv with persistent cache mount
RUN --mount=type=cache,target=/root/.cache/uv \
    uv pip install --system --break-system-packages \
    jupyterhub \
    jupyterlab \
    ipykernel \
    numpy \
    scipy \
    pandas \
    requests

# Setup default research system user before copying configuration files
RUN useradd -m -s /bin/bash -u 1000 researcher \
    && mkdir -p /home/researcher/work \
    && chown -R researcher:researcher /home/researcher

WORKDIR /srv/jupyterhub

# Copy JupyterHub configuration (isolated at the end to prevent cache invalidation)
COPY jupyterhub_config.py /srv/jupyterhub/jupyterhub_config.py

EXPOSE 8000

CMD ["jupyterhub", "-f", "/srv/jupyterhub/jupyterhub_config.py"]
