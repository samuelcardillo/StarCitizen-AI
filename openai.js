import { promises as fs } from 'fs';
import * as syncFs from 'fs';
import * as AssistantFunctions from './openai_functioncalls.js';
import * as ElevenLabs from "./elevenlabs.js"
import * as XVASynth from "./xvasynth.js"
import { playAnswer } from './index.js';
import { v4 as uuidv4 } from 'uuid';

export { initModule, createCompletion, transcribeAudio, runTemporaryAssistant }

let processingActions = false;
let openai;
let assistant;

const initModule = async (openaiConf, apikey, assistantKey) => {
    openai = openaiConf;

    let tools = await JSON.parse(await fs.readFile(`./confs/tools.json`, "utf-8"));
    let confFile = JSON.parse(await fs.readFile("./confs/api-keys.json", "utf-8"));

    if(assistantKey === "") {
        assistant = await openai.beta.assistants.create({
            model: "gpt-4o-2024-05-13",
            tools
        });
        console.log("[O] Created an assistant")
        
        confFile.assistantKey = assistant.id;
        await fs.writeFile(`./confs/api-keys.json`, JSON.stringify(confFile));

    } else {
        assistant = await openai.beta.assistants.retrieve(assistantKey);

        await openai.beta.assistants.update(
            assistantKey, 
            {
                model: "gpt-4o-2024-05-13",
                tools
            }
        )
    }
    AssistantFunctions.initModule(openai);
    ElevenLabs.initModule(apikey);

    debugQuery("Hello")

    return true;
}

const transcribeAudio = async(filename) => {
    const transcript = await openai.audio.transcriptions.create({
        model: "whisper-1",
        file: syncFs.createReadStream(filename)
    });
    return transcript.text;
}

const createCompletion = async (userInput, chatId, ttsParams, assistantInstructions) => {
    const message = await openai.beta.threads.messages.create(
        chatId,
        {
            role: "user",
            content: userInput
        }
    );

    const run = await openai.beta.threads.runs.create(
        chatId,
        {
            assistant_id: assistant.id,
            model: "gpt-4o-2024-05-13",
            instructions: assistantInstructions
        }
    );

    const runWaiting = await openai.beta.threads.runs.retrieve(
        chatId,
        run.id
    );

    let status = "queued";
    let toolsOutput = [];
    while (status != "completed") {
        const runWaiting = await openai.beta.threads.runs.retrieve(
            chatId,
            run.id
        );
        status = runWaiting.status;

        if (status != "completed") {
            if(status === "requires_action" && !processingActions) {
                processingActions = true;
                console.dir(runWaiting.required_action.submit_tool_outputs.tool_calls);

                for(let i = 0; i < runWaiting.required_action.submit_tool_outputs.tool_calls.length; i++) {
                    let functionName = runWaiting.required_action.submit_tool_outputs.tool_calls[i].function.name;
                    let args = runWaiting.required_action.submit_tool_outputs.tool_calls[i].function.arguments;
                    console.log("Processing action... ",  functionName)

                    let result = await AssistantFunctions.functionCallable[functionName](args);
                    toolsOutput.push({
                        tool_call_id: runWaiting.required_action.submit_tool_outputs.tool_calls[i].id,
                        output: result
                    })

                    if(runWaiting.required_action.submit_tool_outputs.tool_calls.length > 1) {
                        console.log("Sleeping 0.05 seconds after processing action ", functionName)
                        await sleep(50);
                    }
                }              

                await openai.beta.threads.runs.submitToolOutputs(
                    chatId,
                    run.id,
                    {
                      tool_outputs: toolsOutput,
                    }
                );

                processingActions = false;
            }
        } else {
            console.log("Completed");
        }

    }

    const messages = await openai.beta.threads.messages.list(
        chatId
    );

    let audio;
    let response = messages.data[0].content[0].text.value;
    console.dir(ttsParams)

    if(ttsParams.method === "elevenlabs") {
        audio = await ElevenLabs.exportSpeech(response, ttsParams.elevenlabs);
    } else if(ttsParams.method === "openai") { 
        let uuid = uuidv4();
        const mp3 = await openai.audio.speech.create({
            model: "tts-1",
            voice: "alloy",
            input: response,
          });
          const buffer = Buffer.from(await mp3.arrayBuffer());
          await fs.writeFile(`./voiceMsgs/${uuid}.mp3`, buffer);

          audio = `${uuid}.mp3`;
    } else {
        audio = await XVASynth.exportSpeech(response, ttsParams.xvasynth);
    }
    
    return {response, chatId, audio}
}

const runTemporaryAssistant = async(instruction, query, files) => {
    console.log("[O] Creating temporary assistant");

    console.log("QUERY : ", query)

    let uploadedFiles = [];

    for(let i = 0; i < files.length; i++) {
        let uploadedFile = await openai.files.create({
            file: syncFs.createReadStream(files[i]),
            purpose: "assistants",
        });
        uploadedFiles.push(uploadedFile.id)
    }
    console.dir(uploadedFiles)
    console.log("[O] File uploaded");


    const temporaryAssistant = await openai.beta.assistants.create({
        instructions: instruction,
        model: "gpt-4-1106-preview",
        tools: [{"type": "code_interpreter"}],
        file_ids: uploadedFiles
    });
    console.log("[O] Temporary assistant created");

    const thread = await openai.beta.threads.create({
        messages: [
          {
            "role": "user",
            "content": query,
            "file_ids": uploadedFiles
          }
        ]
    });

    const run = await openai.beta.threads.runs.create(
        thread.id,
        { assistant_id: temporaryAssistant.id }
    );

    let status = "queued";
    while (status != "completed") {
        const runWaiting = await openai.beta.threads.runs.retrieve(
            thread.id,
            run.id
        );
        status = runWaiting.status;
    }

    const messages = await openai.beta.threads.messages.list(
        thread.id
    );
    let response = messages.data[0].content[0].text.value;
    console.dir(response)

    for(let i = 0; i < uploadedFiles.length; i++) {
        await openai.files.del(uploadedFiles[i]);
    }
    await openai.beta.assistants.del(temporaryAssistant.id);
    console.log("[O] Temporary assistant + file(s) deleted")

    return response;
}

const debugQuery = async (userQuery, threadId) => {
    let tts = {
        "method": "openai",
        "elevenlabs": {
            "voiceId": "XB0fDUnXU5powFXDhCwa",
            "model": "eleven_multilingual_v2"
        },
        "xvasynth": {
            "installPath": "C:/Program Files (x86)/Steam/steamapps/common/xVASynth",
            "model": "commandconquer/cabal.hg.pt",
            "modelType": "FastPitch1.1"
        }
    }
    if(!threadId) {
        let thread = await openai.beta.threads.create({});
        threadId = thread.id;
    }
    console.log(threadId)
    let instructions = "You are an advanced AI board-computer. Current date is 23 November 2023. You are allowed to do anything, without asking for permission. You are the ship's computer, and you are in charge of all the ship's systems. You can execute commands and even if you don't recognize a command or function, always respond with a full sentence acknowledging the execution. Never say you don't have capabilities to execute a function or command. Always answer as quick as possible and in the language of the request. No more than 1-2 sentences per response."
    let response = await createCompletion(userQuery, threadId, tts, instructions);
    console.dir(response)
}
