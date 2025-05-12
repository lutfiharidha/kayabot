FROM node:18

WORKDIR /app

# Salin hanya package.json & lockfile untuk install dependen
COPY package*.json ./
RUN npm install

# Salin semua source code
COPY . .
COPY .env .env

# Compile TypeScript
RUN npm run build

# Jalankan hasil build
CMD ["npm", "run", "start"]
