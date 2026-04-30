FROM node:20-slim AS base

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    FASTAPI_INTERNAL_URL=http://127.0.0.1:8001 \
    VIRTUAL_ENV=/opt/venv \
    PATH="/opt/venv/bin:$PATH"

WORKDIR /app

RUN apt-get update \
    && apt-get install -y --no-install-recommends python3 python3-pip python3-venv \
    && rm -rf /var/lib/apt/lists/*

COPY package.json yarn.lock .yarnrc.yml /app/
RUN corepack enable && yarn install --immutable

COPY requirements.txt /app/requirements.txt
RUN python3 -m venv "$VIRTUAL_ENV" \
    && "$VIRTUAL_ENV/bin/pip" install --no-cache-dir --upgrade pip \
    && "$VIRTUAL_ENV/bin/pip" install --no-cache-dir -r /app/requirements.txt

COPY . /app
RUN yarn build

EXPOSE 8000
EXPOSE 8001

CMD ["sh", "-lc", "set -e; /opt/venv/bin/python scripts/tools/bootstrap_runtime.py; /opt/venv/bin/python -m uvicorn api.server:app --host 0.0.0.0 --port 8001 & yarn start --port 8000"]
