FROM node:22

WORKDIR /app

RUN apt-get update && \
    apt-get install -y python3 python3-pip

COPY package*.json ./
RUN npm install

COPY backend/requirements.txt ./backend/

RUN pip3 install --break-system-packages -r backend/requirements.txt

COPY . .

RUN npm install --legacy-peer-deps

ENV NODE_ENV=production

EXPOSE 8080

CMD ["npm","start"]