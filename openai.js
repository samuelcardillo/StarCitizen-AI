import { promises as fs } from 'fs';
import * as AssistantFunctions from './openai_functioncalls.js';
import * as ElevenLabs from "./elevenlabs.js"
import * as XVASynth from "./xvasynth.js"
import { playAnswer } from './index.js';

export { initModule, createCompletion }

let processingActions = false;
let openai;
let assistant;

const initModule = async (openaiConf, apikey, assistantKey) => {
    openai = openaiConf;

    let tools = await JSON.parse(await fs.readFile(`./confs/tools.json`, "utf-8"));
    let confFile = JSON.parse(await fs.readFile("./confs/api-keys.json", "utf-8"));


    if(assistantKey === "") {
        assistant = await openai.beta.assistants.create({
            model: "gpt-4-1106-preview",
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
                model: "gpt-4-1106-preview",
                tools
            }
        )
    }
    AssistantFunctions.initModule(openai);
    ElevenLabs.initModule(apikey)

    return true;
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
            model: "gpt-4-1106-preview",
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

    if(ttsParams.method === "elevenlabs") {
        audio = await ElevenLabs.exportSpeech(response, ttsParams.elevenlabs);
    } else {
        audio = await XVASynth.exportSpeech(response, ttsParams.xvasynth);
    }
    
    playAnswer(response, chatId, audio);
}
