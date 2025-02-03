# Koristi Node.js kao osnovni image
FROM node:16

# Postavi radni direktorijum unutar kontejnera
WORKDIR /app

# Kopiraj package.json i package-lock.json u radni direktorijum
COPY package*.json ./

# Instaliraj zavisnosti
RUN npm install

# Kopiraj ostatak aplikacije u kontejner
COPY . .

# Eksponiraj port na kojem aplikacija radi
EXPOSE 3001

# Pokreni aplikaciju
CMD ["npm", "start"]