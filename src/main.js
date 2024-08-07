import { Telegraf, session } from "telegraf";
import { message } from "telegraf/filters";
import conf from "config";
import { ogg } from "./voiceConverter.js";
import { openAI } from "./openAI.js";
import { code } from "telegraf/format";
import { deleteFile } from "./utils.js";

const bot = new Telegraf(conf.get("TELEGRAM_TOKEN"));
bot.use(session());

export const INITIAL_SESSION = {
	messages: [],
};

export async function initCommand(context) {
	context.session = INITIAL_SESSION;
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

bot.on(message("text"), async (context) => {
	context.session ??= INITIAL_SESSION;
	try {
		await context.reply(
			code("Message accepted. Waiting response from server...")
		);
		await processTextToChat(context, context.message.text);
	} catch (e) {
		console.log(`Error while text message`, e.message);
	}
});

bot.on(message("voice"), async (context) => {
	context.session ??= INITIAL_SESSION;
	try {
		await context.reply(
			code("Message accepted. Waiting response from server..")
		);
		const link = await context.telegram.getFileLink(
			context.message.voice.file_id
		);
		const userID = String(context.message.from.id);
		const oggFilePath = await ogg.create(link.href, userID);
		const mp3FilePath = await ogg.convert_to_Mp3(oggFilePath, userID);
		deleteFile(oggFilePath);

		const text = await openAI.transcription(mp3FilePath);
		console.log("Transcribed Text:", text);

		if (!text) {
			throw new Error("Transcription returned an empty result");
		}

		context.session.messages.push({
			role: openAI.roles.USER,
			content: text,
		});

		const response = await openAI.chat(context.session.messages);

		console.log("Response content", response);

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