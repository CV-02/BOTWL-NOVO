# Usa a imagem oficial do Node.js
FROM node:18

# Define o diretório de trabalho dentro do container
WORKDIR /app

# Copia os arquivos do projeto para dentro do container
COPY package.json package-lock.json* ./

# Instala as dependências
RUN npm install

# Copia o restante do código para o container
COPY . .

# Comando para rodar o bot
CMD ["node", "index.js"]
