# Use the official Node.js image as the base image
FROM node:18-alpine

# Set the working directory
WORKDIR /app

# Copy package.json and package-lock.json
COPY package.json package-lock.json ./

# Install dependencies
RUN npm install

# Copy the rest of the application files
COPY . .

# Build the application
RUN npm run build

# Install a lightweight web server
RUN npm install -g serve

EXPOSE 5173

# Use the lightweight web server to serve the build files
CMD ["serve", "-s", "dist"]
