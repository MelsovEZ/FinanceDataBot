import { Telegraf, Markup } from 'telegraf';
import { readSheet, getSheetNames } from './sheet';
import { generateAndDownloadChart } from './chart';
import 'dotenv/config';

// Инициализация бота с использованием токена, хранящегося в переменных окружения
const bot = new Telegraf(process.env.BOT_ID);

// Объявляем переменные для хранения списка компаний и отображения названий компаний с уникальными ID
let companies: string[] = [];
let companyMap: { [key: string]: string } = {};

// Функция для обновления списка компаний путем получения актуальных названий из Google Sheets
async function updateCompanies() {
    try {
        // Получаем новые названия компаний из таблицы
        const newCompanies = await getSheetNames();

        // Обновляем список компаний только если есть изменения (например, добавлены новые компании или удалены старые)
        if (JSON.stringify(newCompanies) !== JSON.stringify(companies)) {
            companies = newCompanies;

            // Создаем отображение названий компаний с уникальными идентификаторами (company_0, company_1 и т.д.)
            companyMap = companies.reduce((acc, company, index) => {
                acc[`company_${index}`] = company;
                return acc;
            }, {} as { [key: string]: string });

            // Перегенерируем клавиатуру для выбора компании
            generateCompaniesKeyboard();
        }
    } catch (error) {
        // Логируем ошибки, если возникли проблемы при обновлении списка компаний
        console.error('Ошибка обновления списка компаний:', error);
    }
}

// Функция для генерации клавиатуры с кнопками для выбора компаний
function generateCompaniesKeyboard() {
    // Ожидаем, что пользователь запросит показать компании, и отвечаем
    bot.hears('Показать компании', (ctx) => {
        // Отправляем пользователю список компаний в виде кнопок, каждая из которых привязана к уникальному ID
        ctx.reply('Выберите компанию:', Markup.inlineKeyboard(
            Object.keys(companyMap).map((companyId) => [Markup.button.callback(companyMap[companyId], companyId)])
        ));
    });
}

// Обработчик для выбора компании. Срабатывает, когда пользователь нажимает на кнопку с компанией.
bot.action(/company_(.+)/, async (ctx) => {
    // Извлекаем ID компании из данных callback'а кнопки
    const companyId = `company_${ctx.match[1]}`;
    const company = companyMap[companyId]; // Получаем название компании по ID

    // Если компания не найдена (например, если данные обновились), выводим сообщение об ошибке
    if (!company) {
        return ctx.reply('Компания не найдена. Попробуйте снова.', Markup.inlineKeyboard(
            Object.keys(companyMap).map((id) => [Markup.button.callback(companyMap[id], id)])
        ));
    }
    
    // Список типов данных, которые пользователь может выбрать для выбранной компании
    const dataTypes = ['Доходы', 'Расходы', 'Прибыль', 'КПН', 'Все данные'];

    // Удаляем предыдущее сообщение и просим пользователя выбрать тип данных
    await ctx.deleteMessage();
    await ctx.reply(`Вы выбрали "${company}". Выберите тип данных:`, Markup.inlineKeyboard([
        ...dataTypes.map((dataType) => [Markup.button.callback(dataType, `select_dataType_${ctx.match[1]}_${dataType}`)]),
        [Markup.button.callback('Назад', 'back_to_companies')]
    ]));
});

// Обработчик для выбора типа данных после выбора компании
bot.action(/select_dataType_(.+)_(.+)/, async (ctx) => {
    // Извлекаем ID компании и тип данных из данных callback'а кнопки
    const companyId = `company_${ctx.match[1]}`;
    const dataType = ctx.match[2];
    const company = companyMap[companyId]; // Получаем название компании по ID

    // Если компания не найдена (например, данные были обновлены), выводим сообщение об ошибке
    if (!company) {
        return ctx.reply('Компания не найдена. Попробуйте снова.', Markup.inlineKeyboard(
            Object.keys(companyMap).map((id) => [Markup.button.callback(companyMap[id], id)])
        ));
    }

    // Сообщаем пользователю, что данные обрабатываются
    const loadingMessage = await ctx.reply(`Вы выбрали "${company}" и тип данных "${dataType}". Пожалуйста, подождите...`);
    
    try {
        // Удаляем сообщение о загрузке перед началом обработки
        await ctx.deleteMessage();
        // Получаем данные компании из Google Sheets
        const data = await readSheet(company);
        // Генерируем диаграмму на основе выбранного типа данных и сохраняем ее в виде изображения
        await generateAndDownloadChart(data, dataType);
        // После генерации диаграммы удаляем сообщение о загрузке
        await ctx.deleteMessage(loadingMessage.message_id);
        // Отправляем пользователю сгенерированную диаграмму в виде изображения
        await ctx.replyWithPhoto({ source: './src/chart.png' }, Markup.inlineKeyboard([
            [Markup.button.callback('Назад', `company_${ctx.match[1]}`)] // Предоставляем кнопку "Назад" для возврата к выбору компании
        ]));
    } catch (error) {
        // Логируем ошибки и уведомляем пользователя, если что-то пошло не так
        console.error(error);
        ctx.deleteMessage(loadingMessage.message_id);
        ctx.reply('Произошла ошибка. Попробуйте позже.', Markup.inlineKeyboard([
            [Markup.button.callback('Назад', `company_${ctx.match[1]}`)] // Предоставляем кнопку "Назад" для повторной попытки
        ]));
    }
});

// Обработчик для кнопки "Назад", позволяющий пользователю вернуться к выбору компаний
bot.action('back_to_companies', async (ctx) => {
    // Удаляем предыдущее сообщение и показываем клавиатуру с выбором компаний снова
    await ctx.deleteMessage();
    await ctx.reply('Выберите компанию:', Markup.inlineKeyboard(
        Object.keys(companyMap).map((companyId) => [Markup.button.callback(companyMap[companyId], companyId)])
    ));
});

// Функция инициализации бота, которая получает начальный список компаний и настраивает команды
async function initializeBot() {
    try {
        // Получаем начальный список компаний и настраиваем его обновление каждые 5 секунд
        await updateCompanies();
        setInterval(updateCompanies, 5000);

        // Команда /start для начала взаимодействия
        bot.telegram.setMyCommands([
            {
              command: 'start',
              description: 'Запуск бота', // Описание команды /start
            }
        ]);

        // Обработчик для команды /start
        bot.start((ctx) => {
            ctx.reply(`Добро пожаловать!\n\nЭтот бот был создан @mels_ov в рамках тестового задания для компании "ТОО LILUMA Enterprises".\n\nЧтобы продолжить, нажмите кнопку в меню.`,
                Markup.keyboard([
                    ['Показать компании']
                ])
                    .resize()
                    .oneTime());
        });

        // Запускаем бота
        bot.launch();

        // Логируем успешный запуск бота и обрабатываем сигналы для его корректного завершения
        console.log('Бот запущен.');
        process.once('SIGINT', () => bot.stop('SIGINT'));
        process.once('SIGTERM', () => bot.stop('SIGTERM'));
    } catch (error) {
        console.error('Ошибка инициализации бота:', error);
    }
}

// Запуск инициализации бота
initializeBot();
