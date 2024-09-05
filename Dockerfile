# Используем базовый образ с Node.js
FROM node:20-alpine3.19

# Устанавливаем рабочую директорию
WORKDIR /app

# Копируем package.json и package-lock.json для установки зависимостей
COPY package*.json ./

# Устанавливаем зависимости
RUN npm install

# Копируем остальные файлы проекта
COPY . .

# Открываем порт для взаимодействия с ботом (опционально)
EXPOSE 3000

# Устанавливаем команду по умолчанию для запуска приложения
CMD ["npm", "start"]
