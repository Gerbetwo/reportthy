FROM node:20-slim

# Install TeX Live typesetting tools and Python 3 for JupyterLite build
RUN apt-get update && apt-get install -y --no-install-recommends \
    texlive-latex-base \
    texlive-latex-extra \
    texlive-fonts-recommended \
    python3 \
    python3-pip \
    python3-venv \
    && rm -rf /var/lib/apt/lists/*

# Install JupyterLite Core and Pyodide kernel
RUN pip install --no-cache-dir --break-system-packages jupyterlite-core jupyterlite-pyodide-kernel || \
    pip install --no-cache-dir jupyterlite-core jupyterlite-pyodide-kernel

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .

# Build self-hosted static JupyterLite environment into public/jupyterlite
RUN jupyter lite build --output-dir public/jupyterlite || echo "JupyterLite pre-built or skipped"

ENV NODE_ENV=production
RUN npm run build

EXPOSE 3000

CMD ["npm", "run", "start"]
