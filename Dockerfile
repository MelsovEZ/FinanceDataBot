# Используем базовый образ с Node.js
FROM node:20-alpine3.19

# Устанавливаем рабочую директорию
WORKDIR /app/src

# Копируем package.json и package-lock.json для установки зависимостей
COPY package*.json ./

# Устанавливаем зависимости
RUN npm install

# Копируем остальные файлы проекта
COPY . .

# Устанавливаем команду по умолчанию для запуска приложения
CMD ["npm", "start"]