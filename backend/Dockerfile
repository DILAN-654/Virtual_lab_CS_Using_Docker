FROM node:20-alpine

# Create app directory
WORKDIR /usr/src/app

# Install app dependencies
COPY package.json package-lock.json* ./
RUN npm ci --omit=dev

# Bundle app source
COPY . .

# Expose port
EXPOSE 5000

# Healthcheck (optional)
HEALTHCHECK --interval=30s --timeout=5s --start-period=5s CMD node -e "require('http').get('http://localhost:5000/api/health', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})" || exit 1

CMD ["npm", "start"]
