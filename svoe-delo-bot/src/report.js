import PDFDocument from 'pdfkit';
import fs from 'node:fs';
import path from 'node:path';
import dayjs from 'dayjs';
import { DAYS } from './content.js';

export function generateReport({ user, answers }) {
	const reportsDir = path.join(process.cwd(), 'reports');
	fs.mkdirSync(reportsDir, { recursive: true });
	const filePath = path.join(
		reportsDir,
		`report_${user.id}_${dayjs().format('YYYYMMDD_HHmmss')}.pdf`
	);

	const doc = new PDFDocument({ margin: 50 });
	const stream = fs.createWriteStream(filePath);
	doc.pipe(stream);

	doc.fontSize(20).text('Своё Дело — Итоговый отчёт', { align: 'center' });
	doc.moveDown();
	doc.fontSize(12).text(`Пользователь: ${user.first_name ?? ''} ${user.last_name ?? ''} (@${user.username ?? ''})`);
	doc.text(`Дата: ${dayjs().format('DD.MM.YYYY HH:mm')}`);
	doc.moveDown();

	for (const day of DAYS) {
		doc.fontSize(16).text(`День ${day.num}: ${day.title}`);
		doc.moveDown(0.5);
		const dayAnswers = answers.filter(a => a.day === day.num);
		if (dayAnswers.length === 0) {
			doc.fontSize(10).fillColor('gray').text('Нет ответов');
			doc.fillColor('black');
			doc.moveDown();
			continue;
		}
		for (const a of dayAnswers) {
			const prompt = day.prompts?.[a.prompt_index] ?? `Шаг ${a.prompt_index + 1}`;
			doc.fontSize(12).text(`• ${prompt}`);
			doc.moveDown(0.2);
			doc.fontSize(11).fillColor('#333').text(a.answer);
			doc.fillColor('black');
			doc.moveDown();
		}
		doc.moveDown(0.5);
	}

	doc.end();
	return new Promise((resolve, reject) => {
		stream.on('finish', () => resolve(filePath));
		stream.on('error', reject);
	});
}