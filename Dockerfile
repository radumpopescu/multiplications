# Stage 1: Build the frontend
FROM node:18 AS frontend-builder

WORKDIR /app

# Copy frontend package.json and package-lock.json
COPY frontend/package.json frontend/package-lock.json ./frontend/
COPY package.json package-lock.json ./

# Install frontend dependencies
RUN npm install --workspaces

# Copy the rest of the frontend code
COPY frontend ./frontend

# Build the frontend
RUN npm run build -w frontend

# Stage 2: Setup the backend
FROM node:18 AS backend-runner

WORKDIR /app

# Copy backend package.json and package-lock.json
COPY backend/package.json backend/package-lock.json ./backend/
COPY package.json package-lock.json ./

# Install backend dependencies
RUN npm install --workspaces --omit=dev

# Copy the rest of the backend code
COPY backend ./backend

# Copy the built frontend from the previous stage
COPY --from=frontend-builder /app/frontend/dist ./frontend/dist

# Expose the port the app runs on
EXPOSE 3000

# Start the server
CMD ["node", "backend/index.js"]
