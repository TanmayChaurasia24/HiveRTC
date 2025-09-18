FROM node:18-alpine as build
WORKDIR /app
COPY package.json ./
COPY pnpm-lock.yaml ./
RUN npm install
COPY . .
RUN npm run build    
CMD ["npm", "run", "dev"]