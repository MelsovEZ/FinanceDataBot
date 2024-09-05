import axios from 'axios';
import * as fs from 'fs';
import * as path from 'path';

// Создает, скачивает и отправляет график
export async function generateAndDownloadChart(data: string[][], selectedType: string) {
    const labels = data.slice(1).map((row: string[]) => row[0].trim());

    // Инициализация данных в зависимости от выбранного типа
    let datasets = [];

    if (selectedType === 'Доходы' || selectedType === 'Все данные') {
        const revenue = data.slice(1).map((row: string[]) => parseInt(row[1].replaceAll(',', '')));
        datasets.push({
            label: data[0][1],
            data: revenue,
            backgroundColor: 'rgba(75, 192, 192, 0.2)',
            borderColor: 'rgba(75, 192, 192, 1)',
            borderWidth: 1
        });
    }

    if (selectedType === 'Расходы' || selectedType === 'Все данные') {
        const expenses = data.slice(1).map((row: string[]) => parseInt(row[2].replaceAll(',', '')));
        datasets.push({
            label: data[0][2],
            data: expenses,
            backgroundColor: 'rgba(255, 99, 132, 0.2)',
            borderColor: 'rgba(255, 99, 132, 1)',
            borderWidth: 1
        });
    }

    if (selectedType === 'Прибыль' || selectedType === 'Все данные') {
        const profit = data.slice(1).map((row: string[]) => parseInt(row[3].replaceAll(',', '')));
        datasets.push({
            label: data[0][3],
            data: profit,
            backgroundColor: 'rgba(54, 162, 235, 0.2)',
            borderColor: 'rgba(54, 162, 235, 1)',
            borderWidth: 1
        });
    }

    if (selectedType === 'КПН' || selectedType === 'Все данные') {
        const kpn = data.slice(1).map((row: string[]) => parseInt(row[4].replaceAll(',', '')));
        datasets.push({
            label: data[0][4],
            data: kpn,
            backgroundColor: 'rgba(153, 102, 255, 0.2)',
            borderColor: 'rgba(153, 102, 255, 1)',
            borderWidth: 1
        });
    }

    const chartConfig = {
        type: 'bar',
        data: {
            labels: labels,
            datasets: datasets
        }
    };
 
    try {
        // Отправка запроса на создание графика
        const response = await axios.post('https://quickchart.io/chart/create', {
            chart: chartConfig
        });

        const chartUrl = response.data.url;

        // Скачивание графика
        const imageResponse = await axios.get(chartUrl, {
            responseType: 'arraybuffer'
        });
        const buffer = Buffer.from(imageResponse.data, 'binary');

        // Сохранение графика
        const filePath = path.join(__dirname, 'chart.png');
        await fs.promises.writeFile(filePath, buffer);
    } catch (error) {
        console.error('Error generating or downloading chart:', error);
    }
}
