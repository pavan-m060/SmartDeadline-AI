FROM node:22

WORKDIR /app

RUN apt-get update && \
    apt-get install -y python3 python3-pip

COPY package*.json ./

# Install Node dependencies
RUN npm install --legacy-peer-deps

COPY backend/requirements.txt ./backend/

# Install Python dependencies
RUN pip3 install --break-system-packages -r backend/requirements.txt

COPY . .

# Build the React app
RUN npm run build

ENV NODE_ENV=production

EXPOSE 8080

CMD ["npm","start"]