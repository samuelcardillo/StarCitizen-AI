import * as AssistantFunctions from './openai_functioncalls.js';
import * as ElevenLabs from "./elevenlabs.js"
import { playAnswer } from './index.js';

export { initModule, createCompletion }

let processingActions = false;
let openai;
let assistant;

const initModule = async (openaiConf, apikey) => {
    openai = openaiConf;
    assistant = await openai.beta.assistants.retrieve("asst_jeYPNDtt6xcsCXkPRZMDf2LP");
    AssistantFunctions.initModule(openai);
    ElevenLabs.initModule(apikey)

    return true;
}

const createCompletion = async (userInput, useEleven, chatId, voiceId, assistantInstructions) => {
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
    if(useEleven) {
        audio = await ElevenLabs.exportSpeech(response, voiceId);
    }

    playAnswer(response, chatId, audio);
}

// createCompletion("using the computer vision do you see any craters on the imagery I'm looking at", false, "thread_KfSUH0qazaalBqbjPh6BSOU5", "0", "Babu")
