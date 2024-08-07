import axios from "axios";
import ffmpeg from "fluent-ffmpeg";
import installer from "@ffmpeg-installer/ffmpeg";
import { createWriteStream } from "fs";
import { dirname, resolve } from "path";
import { fileURLToPath } from "url";
import { deleteFile } from "./utils.js";

const __dirname = dirname(fileURLToPath(import.meta.url));

class OggToMp3Converter {
	constructor() {
		ffmpeg.setFfmpegPath(installer.path); //path to converter
	}
	async create(url, filename) {
		try {
			const oggFilePath = resolve(__dirname, "../voices", `${filename}.ogg`);
			const response = await axios({
				method: "get",
				url,
				responseType: "stream",
			});
			return new Promise((resolve) => {
				const stream = createWriteStream(oggFilePath);
				response.data.pipe(stream);
				stream.on("finish", () => resolve(oggFilePath));
			});
		} catch (error) {
			console.log("Error during ogg file creation", error.message);
		}
	}
	convert_to_Mp3(input, output) {
		try {
			const outputPath = resolve(dirname(input), `${output}.mp3`);
			return new Promise((resolve, reject) => {
				ffmpeg(input)
					.inputOption("-t 30")
					.output(outputPath)
					.on("end", () => {
						resolve(outputPath);
					})
					.on("error", (err) => reject(err.message))
					.run();
			});
		} catch (e) {
			console.log("Error while creating mp3", e.message);
		}
	}
}

export const ogg = new OggToMp3Converter();
