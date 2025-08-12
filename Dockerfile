# Imagem base oficial do Node.js
FROM node:20-alpine

# Diretório de trabalho
WORKDIR /app

# Copiar package.json e package-lock.json
COPY package*.json ./

# Instalar dependências
RUN npm install --production

# Copiar o restante do código
COPY . .

# Criar diretórios para logs e dados
RUN mkdir -p logs data && chmod -R 777 logs data

# Expor nenhuma porta (bot Telegram não precisa)

# Comando para iniciar o bot
CMD ["node", "src/bot.js"] 