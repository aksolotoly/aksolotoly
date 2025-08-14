import 'dotenv/config';
import { Bot, InlineKeyboard, InputFile } from 'grammy';
import { conversations, createConversation } from '@grammyjs/conversations';
import { BOT_COPY, DAYS } from './content.js';
import { upsertUser, getProgress, setProgress, saveAnswer, getAllAnswers } from './db.js';
import { generateReport } from './report.js';

const token = process.env.BOT_TOKEN;
if (!token) {
	console.error('BOT_TOKEN is not set in .env');
	process.exit(1);
}

const bot = new Bot(token);
bot.use(conversations());

async function dayFlow(conversation, ctx) {
	const userId = ctx.from.id;
	let { day, step } = getProgress(userId);

	while (day <= DAYS.length) {
		const d = DAYS[day - 1];
		if (step === 0) {
			await ctx.reply(`\u2728 ${BOT_COPY.dayTitle(d.num, d.title)}\n${d.intro}`);
			if (d.links?.length) {
				const linksText = d.links.map(l => `• ${l.label}: ${l.url}`).join('\n');
				await ctx.reply(linksText);
			}
		}

		for (let i = step; i < (d.prompts?.length ?? 0); i++) {
			const prompt = d.prompts[i];
			const kb = new InlineKeyboard().text('Далее', 'next');
			await ctx.reply(`\n${prompt}\n\n${BOT_COPY.nextHint}`, { reply_markup: kb });
			let answered = false;
			while (!answered) {
				const next = await conversation.wait();
				if (next?.callbackQuery?.data === 'next') {
					await next.answerCallbackQuery();
					await next.reply('Можно переходить дальше. Если хочешь — добавь ещё текст в следующем шаге.');
					answered = true;
					break;
				}
				const text = next?.message?.text;
				if (text && text.trim().length > 0) {
					saveAnswer(userId, day, i, text.trim());
					await next.reply(BOT_COPY.collected);
					answered = true;
				}
			}
			setProgress(userId, day, i + 1);
		}

		day += 1;
		step = 0;
		setProgress(userId, day, step);
	}

	await ctx.reply('Ты прошёл(ла) все 7 дней! Можешь сгенерировать отчёт командой /report');
}

bot.use(createConversation(dayFlow));

bot.command('start', async (ctx) => {
	upsertUser(ctx.from);
	const progress = getProgress(ctx.from.id);
	const kb = new InlineKeyboard()
		.text('Начать/продолжить', 'go')
		.row()
		.text('Справка', 'help');
	await ctx.reply(BOT_COPY.welcome, { reply_markup: kb });
});

bot.command('continue', async (ctx) => {
	await ctx.conversation.enter('dayFlow');
});

bot.command('report', async (ctx) => {
	await ctx.reply(BOT_COPY.reportReady);
	const answers = getAllAnswers(ctx.from.id);
	const filePath = await generateReport({ user: ctx.from, answers });
	await ctx.replyWithDocument(new InputFile(filePath));
});

bot.on('callback_query:data', async (ctx) => {
	const data = ctx.callbackQuery.data;
	if (data === 'go') {
		await ctx.answerCallbackQuery();
		await ctx.conversation.enter('dayFlow');
		return;
	}
	if (data === 'help') {
		await ctx.answerCallbackQuery();
		await ctx.reply(BOT_COPY.help);
		return;
	}
});

bot.catch((err) => {
	console.error('Bot error:', err);
});

(async () => {
	try {
		await bot.api.deleteWebhook({ drop_pending_updates: true });
		await bot.start();
		console.log('Bot started');
	} catch (error) {
		console.error('Failed to start bot:', error);
	}
})();