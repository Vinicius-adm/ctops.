# Usar a imagem oficial do Node.js
FROM node:16-alpine

# Definir o diretório de trabalho no container
WORKDIR /app

# Copiar os arquivos do projeto para o diretório de trabalho
COPY . .

# Instalar as dependências do projeto
RUN npm install

# Expor a porta em que a aplicação vai rodar
EXPOSE 3000

# Iniciar a aplicação
CMD ["npm", "run", "dev"]
