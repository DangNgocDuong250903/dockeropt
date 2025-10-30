# Example of a non-optimized Dockerfile with many issues
FROM node:18
WORKDIR /app

# Bad: Copy everything before installing dependencies (breaks cache)
COPY . .

# Bad: Not using npm ci, separate RUN commands
RUN npm install
RUN npm run build

# Bad: No cleanup of cache
RUN apt-get update
RUN apt-get install -y curl wget

EXPOSE 3000

# Bad: Running as root
CMD ["npm", "start"]

