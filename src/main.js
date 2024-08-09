import { Telegraf, session } from "telegraf";
import { message } from "telegraf/filters";
import { ogg } from "./voiceConverter.js";
import { openAI } from "./openAI.js";
import { code } from "telegraf/format";
import { deleteFile } from "./utils.js";
import "dotenv-flow/config";

const bot = new Telegraf(process.env.TELEGRAM_TOKEN);
bot.use(session());

export const INITIAL_SESSION = {
	messages: [],
};

const ALLOWED_USERS = [1762412636, 5636807255]; //Telegram user IDs can be found using @userinfobot

//Authorization
function isAuthorizedUser(context) {
	return ALLOWED_USERS.includes(context.message.from.id);
}

bot.use(async (context, next) => {
	if (!isAuthorizedUser(context)) {
		await context.sendSticker(
			"https://tlgrm.eu/stickers/HackerBoyStickers#view-3https://tlgrm.eu/_/stickers/ea5/382/ea53826d-c192-376a-b766-e5abc535f1c9/3.webp"
		);
		await context.reply("You are not authorized to use this bot.");
		return;
	}
	return next();
});

export async function initCommand(context) {
	context.session = INITIAL_SESSION;
	await context.sendSticker(
		"https://tlgrm.eu/_/stickers/ea5/382/ea53826d-c192-376a-b766-e5abc535f1c9/96/7.webp"
	);
	await context.reply("Welcome to voice bot communication with chatGPT.");
	await context.reply(
		"To start new conversation with bot - use: /new or /start"
	);
	await context.reply("Waiting for voice or text message..");
}

export async function processTextToChat(context, content) {
	try {
		context.session.messages.push({ role: openAI.roles.USER, content });
		const response = await openAI.chat(context.session.messages);
		context.session.messages.push({
			role: openAI.roles.ASSISTANT,
			content: response.content,
		});
		await context.reply(response.content);
	} catch (e) {
		console.log("Error while proccesing text to gpt", e.message);
	}
}

bot.command("new", initCommand);
bot.command("start", initCommand);
bot.command("get_id", (context) => {
	context.reply(`Your user ID is ${context.message.from.id}`);
});

bot.on(message("text"), async (context) => {
	context.session ??= INITIAL_SESSION;
	try {
		await context.reply(code("Message accepted. Please wait..."));
		await processTextToChat(context, context.message.text);
	} catch (e) {
		console.log(`Error while text message`, e.message);
	}
});

bot.on(message("voice"), async (context) => {
	context.session ??= INITIAL_SESSION;
	try {
		await context.reply(code("Message accepted. Please wait.."));
		const link = await context.telegram.getFileLink(
			context.message.voice.file_id
		);
		const userID = String(context.message.from.id);
		const oggFilePath = await ogg.create(link.href, userID);
		const mp3FilePath = await ogg.convert_to_Mp3(oggFilePath, userID);
		deleteFile(oggFilePath);

		const text = await openAI.transcription(mp3FilePath);

		if (!text) {
			throw new Error("Transcription returned an empty result");
		}

		context.session.messages.push({
			role: openAI.roles.USER,
			content: text,
		});

		const response = await openAI.chat(context.session.messages);
		if (!response || !response.content) {
			throw new Error("Chat response returned an empty result");
		}

		context.session.messages.push({
			role: openAI.roles.ASSISTANT,
			content: response.content,
		});

		await context.reply(response.content);
	} catch (error) {
		console.log("Error occurred during voice message", error.message);
	}
});

bot.command("start", async (context) => {
	await context.reply(JSON.stringify(context.message, null, 2));
});

bot.launch();

process.once("SIGINT", () => bot.stop("SIGINT"));
process.once("SIGTERM", () => bot.stop("SIGTERM"));
