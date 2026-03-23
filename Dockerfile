FROM nikolaik/python-nodejs:python3.11-nodejs18-slim

WORKDIR /app

# Copy dependency files
COPY package*.json ./
COPY python-service/requirements.txt ./python-service/

# Install Node dependencies
RUN npm install

# Install Python dependencies
RUN pip install --no-cache-dir -r python-service/requirements.txt uvicorn setuptools

# Copy rest of the application
COPY . .

# Generate Prisma client
RUN npx prisma generate

# Setup start script
RUN chmod +x start.sh

CMD ["./start.sh"]
