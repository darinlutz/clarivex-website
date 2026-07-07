# ---- Dependencies ----
FROM node:20-slim AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

# ---- Build ----
FROM node:20-slim AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npm run build

# ---- Runtime ----
FROM node:20-slim AS runner
WORKDIR /app
ENV NODE_ENV=production

# Python 3 for plot_stock.py, isolated in a venv to avoid Debian's
# "externally managed environment" restriction on the system interpreter.
RUN apt-get update && apt-get install -y --no-install-recommends \
      python3 \
      python3-venv \
    && rm -rf /var/lib/apt/lists/* \
    && python3 -m venv /opt/venv

ENV PATH="/opt/venv/bin:$PATH"

COPY requirements.txt ./
RUN pip install --no-cache-dir -r requirements.txt

# Next.js standalone server output
COPY --from=builder /app/public ./public
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static

# Script invoked via execFile('python', ...) at runtime
COPY plot_stock.py ./

EXPOSE 3000
ENV PORT=3000
CMD ["node", "server.js"]
