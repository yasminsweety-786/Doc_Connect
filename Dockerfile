FROM node:18-alpine

WORKDIR /app

# ---- Build Frontend ----
COPY package*.json ./
RUN npm install

# Copy frontend source and build
COPY public/ public/
COPY src/ src/
RUN npm run build
# Note: The built React app will be stored in /app/build

# ---- Setup Backend ----
WORKDIR /app/backend
COPY backend/package*.json ./
RUN npm install

# Copy backend source
COPY backend/ ./

# Expose port 7860 which is required by Hugging Face Spaces
EXPOSE 7860

# Start the server
CMD ["node", "server.js"]
