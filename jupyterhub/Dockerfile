FROM python:3.11-slim

# Install system utilities and Node.js for configurable-http-proxy
RUN apt-get update && apt-get install -y --no-install-recommends \
    curl \
    nodejs \
    npm \
    git \
    build-essential \
    && npm install -g configurable-http-proxy \
    && rm -rf /var/lib/apt/lists/*

# Install JupyterHub, JupyterLab, scientific computing packages
RUN pip install --no-cache-dir \
    jupyterhub \
    jupyterlab \
    notebook \
    ipykernel \
    numpy \
    scipy \
    pandas \
    requests

# Create standard research system user
RUN useradd -m -s /bin/bash -u 1000 researcher \
    && mkdir -p /home/researcher/work \
    && chown -R researcher:researcher /home/researcher

WORKDIR /srv/jupyterhub

COPY jupyterhub_config.py /srv/jupyterhub/jupyterhub_config.py

EXPOSE 8000

CMD ["jupyterhub", "-f", "/srv/jupyterhub/jupyterhub_config.py"]
