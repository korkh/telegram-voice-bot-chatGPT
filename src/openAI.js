import OpenAi from "openai";
import fs from "fs";
import "dotenv-flow/config";

class OpenAI {
	roles = {
		ASSISTANT: "assistant",
		USER: "user",
		SYSTEM: "system",
	};

	constructor(apiKey) {
		const configuration = new OpenAi({
			apiKey,
		});
		this.openai = new OpenAi(configuration);
	}

	async chat(messages) {
		try {
			const response = await this.openai.chat.completions.create({
				model: "gpt-4o-mini",
				messages,
			});

			if (response && response.choices && response.choices[0]) {
				if (response.choices[0].message) {
					return response.choices[0].message;
				} else {
					throw new Error("Chat message data is undefined or invalid");
				}
			} else {
				throw new Error("Chat response data is undefined or invalid");
			}
		} catch (e) {
			console.log("Error while gpt chat", e.message);
		}
	}

	async transcription(filepath) {
		try {
			const response = await this.openai.audio.transcriptions.create({
				file: fs.createReadStream(filepath),
				model: "whisper-1",
			});
			console.log("Transcription API Response:", response); // Log the full response

			if (response && response.text) {
				return response.text;
			} else {
				throw new Error("Transcription response data is undefined or invalid");
			}
		} catch (e) {
			console.log("Error while transcription", e.message);
		}
	}
}

export const openAI = new OpenAI(process.env.OPENAI_APIKEY);
