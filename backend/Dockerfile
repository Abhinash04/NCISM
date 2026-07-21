# NCISM backend — Node API + in-process pg-boss worker, with the
# opendataloader-pdf CLI bundled in (fast mode: JRE 17 + Python, no Docling/GPU).
FROM node:20-bookworm-slim

# --- System deps: JRE for the opendataloader Java core, Python for its CLI wrapper ---
RUN apt-get update \
    && apt-get install -y --no-install-recommends \
        openjdk-17-jre-headless \
        python3 \
        python3-venv \
        python3-pip \
    && rm -rf /var/lib/apt/lists/*

# --- opendataloader-pdf CLI into an isolated venv (fast mode only; no [hybrid]/torch extras) ---
# NOTE: this assumes the PyPI package ships the built Java JAR. If a build fails to
# find the JAR at runtime, build it from source in a maven:3-eclipse-temurin-17 stage
# (see docs/DEPLOYMENT.md) and copy it in.
RUN python3 -m venv /opt/odl \
    && /opt/odl/bin/pip install --no-cache-dir opendataloader-pdf
ENV OPENDATALOADER_CLI_PATH=/opt/odl/bin/opendataloader-pdf

WORKDIR /app

# --- Node deps (cached layer) ---
COPY package*.json ./
RUN npm ci --omit=dev

# --- App source ---
COPY server.js knexfile.js ./
COPY src ./src
COPY data ./data

# Job/upload scratch (mounted as a volume in compose so it persists across restarts)
RUN mkdir -p temp/uploads

EXPOSE 3000
CMD ["node", "server.js"]
