# Use Node.js image for building the project
FROM node:20-alpine AS builder

# Set the working directory
WORKDIR /app

# Copy package.json and package-lock.json
COPY package.json package-lock.json ./

RUN npm install

# Copy the entire source directory
COPY . .

# Build the project
RUN npm run build

CMD ["node", "dist/index.js"]