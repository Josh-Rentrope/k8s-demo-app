# --- Stage 1: Build ---
# Use an official Node.js image as the builder
FROM node:18-alpine AS builder

WORKDIR /app

# Copy package.json and package-lock.json
COPY package.json package-lock.json* ./

# Install dependencies
# Using 'ci' for reproducible builds
RUN npm ci

# Copy the rest of the source code
COPY . .

# Build the React app for production
RUN npm run build

# --- Stage 2: Production ---
# Use a lightweight Nginx image for serving static files
FROM nginx:1.25-alpine

# Copy the built files from the 'builder' stage
COPY --from=builder /app/dist /usr/share/nginx/html

# Copy the custom Nginx configuration
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Expose port 80
EXPOSE 80

# Start Nginx
CMD ["nginx", "-g", "daemon off;"]
