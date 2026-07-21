FROM node:20-alpine
WORKDIR /app

# python3 + bs4/requests power scripts/scrape_reviews.py (review-sentiment aggregator).
# Alpine's pip refuses global installs (PEP 668), hence the venv.
RUN apk add --no-cache python3 py3-pip && \
    python3 -m venv /opt/venv
ENV PATH="/opt/venv/bin:$PATH"
COPY scripts/requirements.txt ./scripts/requirements.txt
RUN pip install --no-cache-dir -r scripts/requirements.txt

COPY package*.json ./
RUN npm install
COPY . .
EXPOSE 4000
CMD ["npm", "run", "dev"]
