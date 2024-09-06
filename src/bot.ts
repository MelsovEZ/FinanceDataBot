import { Telegraf, Markup } from 'telegraf';
import { readSheet, getSheetNames } from './sheet';
import { generateAndDownloadChart } from './chart';
import 'dotenv/config';

// Инициализация бота
const bot = new Telegraf(process.env.BOT_ID);

// Объявление переменной для компаний
let companies: string[] = [];

// Функция для обновления компаний и генерации обработчиков
async function updateCompanies() {
    try {
        const newCompanies = await getSheetNames();

        // Сравниваем новый список компаний с текущим
        if (JSON.stringify(newCompanies) !== JSON.stringify(companies)) {
            companies = newCompanies;

            // Генерация обработчиков для каждой компании
            generateHandlers();
        }
    } catch (error) {
        console.error('Ошибка обновления списка компаний:', error);
    }
}

// Функция для генерации обработчиков
function generateHandlers() {
    const dataTypes = ['Доходы', 'Расходы', 'Прибыль', 'КПН', 'Все данные'];

    companies.forEach((company) => {
        bot.action(`company_${company}`, async (ctx) => {
            await ctx.deleteMessage(); // Удаляем предыдущее сообщение
            await ctx.reply(`Вы выбрали "${company}". Выберите тип данных:`, Markup.inlineKeyboard([
                ...dataTypes.map((dataType) => [Markup.button.callback(dataType, `dataType_${company}_${dataType}`)]),
                [Markup.button.callback('Назад', `back_to_companies_${company}`)] // Добавляем кнопку "Назад"
            ]));
        });

        // Обработчик для выбора типа данных
        dataTypes.forEach((dataType) => {
            bot.action(`dataType_${company}_${dataType}`, async (ctx) => {
                try {
                    await ctx.deleteMessage(); // Удаляем предыдущее сообщение
                    const loadingMessage = await ctx.reply(`Вы выбрали "${company}" и тип данных "${dataType}". Пожалуйста, подождите...`);
                    const data = await readSheet(company);
                    await generateAndDownloadChart(data, dataType);
                    await ctx.deleteMessage(loadingMessage.message_id);
                    await ctx.replyWithPhoto({ source: './src/chart.png' }, Markup.inlineKeyboard([
                        [Markup.button.callback('Назад', `back_to_dataTypes_${company}`)]
                    ]));
                } catch (error) {
                    console.error(error);
                    ctx.reply('Произошла ошибка. Попробуйте позже.', Markup.inlineKeyboard([
                        [Markup.button.callback('Назад', `back_to_dataTypes_${company}`)]
                    ]));
                }
            });
        });

        // Обработчик для кнопки "Назад" при выборе компании
        bot.action(`back_to_companies_${company}`, async (ctx) => {
            await ctx.deleteMessage();
            await ctx.reply('Выберите компанию:', Markup.inlineKeyboard(
                companies.map((company) => [Markup.button.callback(company, `company_${company}`)])
            ));
        });

        // Обработчик для кнопки "Назад" при выборе типа данных
        bot.action(`back_to_dataTypes_${company}`, async (ctx) => {
            await ctx.deleteMessage();
            await ctx.reply(`Вы выбрали "${company}". Выберите тип данных:`, Markup.inlineKeyboard([
                ...dataTypes.map((dataType) => [Markup.button.callback(dataType, `dataType_${company}_${dataType}`)]),
                [Markup.button.callback('Назад', `back_to_companies_${company}`)]
            ]));
        });
    });
}

// Обёртка инициализации в асинхронную функцию
async function initializeBot() {
    try {
        // Первоначальное получение списка компаний
        await updateCompanies();

        // Обновление списка компаний каждые 5 секунд
        setInterval(updateCompanies, 5000);

        bot.telegram.setMyCommands([
            {
              command: 'start',
              description: 'Запуск бота',
            }
          ]);

        // Команда /start
        bot.start((ctx) => {
            ctx.reply(`Добро пожаловать!\n\nЭтот бот был создан @mels_ov в рамках тестового задания для компании "ТОО LILUMA Enterprises".\n\nЧтобы продолжить, нажмите кнопку в меню.`,
                Markup.keyboard([
                    ['Показать компании']
                ])
                    .resize()
                    .oneTime());
        });

        // Обработчик для кнопки "Показать компании"
        bot.hears('Показать компании', (ctx) => {
            ctx.reply('Выберите компанию:', Markup.inlineKeyboard(
                companies.map((company) => [Markup.button.callback(company, `company_${company}`)])
            ));
        });

        // Запуск бота
        bot.launch();

        // Объявление, что бот запустился
        console.log('Бот запущен.')

        // Очистка перед выходом, на всякий
        process.once('SIGINT', () => bot.stop('SIGINT'));
        process.once('SIGTERM', () => bot.stop('SIGTERM'));
    } catch (error) {
        console.error('Ошибка инициализации бота:', error);
    }
}

// Запуск инициализации бота
initializeBot();