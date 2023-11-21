import OpenAI from 'openai';
import { promises as fs } from 'fs';
import * as syncFs from 'fs';
import keyListener from 'node-global-key-listener';
import {playAudioFile} from 'audic';
import * as record from 'node-mic-record';
import { initModule, createCompletion } from './openai.js';

export { playAnswer }

let openai;

// Create reply
async function createReply(chatId, userMessage, assistantInstructions, voiceId) {
    let response;

    try {
        response = await createCompletion(userMessage, true, chatId, voiceId, assistantInstructions);
    } catch (e) {
        console.log("Failed at creating reply: ", e);
    }
}

// Transcribe audio
async function transcribeAudio(filename) {

    const transcript = await openai.audio.transcriptions.create({
        model: "whisper-1",
        file: syncFs.createReadStream(filename)
    });
    return transcript.text;
}

// Play the answer
const playAnswer = async (response, chatId, audio) => {
    console.dir(response);

    await playAudioFile(`./voiceMsgs/${audio}`);
}

/// Speech recorder
const v = new keyListener.GlobalKeyboardListener();
let recording = false;
let file;

const initializeAssistants = async () => {
    let apiKeys = JSON.parse(await fs.readFile("./confs/api-keys.json", "utf-8"));

    if(syncFs.existsSync("./voiceMsgs") === false) {
        syncFs.mkdirSync("voiceMsgs");
    }

    openai = new OpenAI({ apiKey: apiKeys.openai });
    await initModule(openai, apiKeys.elevenlabs);




    let personas = await fs.readdir("./confs/personas");
    for(const key in personas) {
        let persona = await JSON.parse(await fs.readFile(`./confs/personas/${personas[key]}`, "utf-8"));
        console.log("Intializing persona", persona.name)
        if(persona.threadId === "") {
            let thread = await openai.beta.threads.create({});
            persona.threadId = thread.id;
            await fs.writeFile(`./confs/personas/${personas[key]}`, JSON.stringify(persona));
            console.log("[O] Added a thread id");
        } else console.log("[O] Thread ID found");

        v.addListener(async (e, down) => {
            if (e.state == "DOWN" && e.name == persona.key) {
                if(!recording) {
                    try {
                        console.log("Recording started");
                        file = syncFs.createWriteStream('./voiceMsgs/userInput.wav', { encoding: 'binary' })
                        record.start().pipe(file)
                        
                    } catch(e) {
                        console.log(e);
                    }
                } else {
                    try {
                        console.log("Recording stopped");
                        record.stop()
                        let text = await transcribeAudio("voiceMsgs/userInput.wav");
                        console.log("You: ", text);
                        createReply(persona.threadId, text, persona.instruction, persona.voiceId);
                    } catch(e) {
                        console.log(e);
                    }
                   
                }
        
                recording = !recording;
            }
        });
    }
}

initializeAssistants();

