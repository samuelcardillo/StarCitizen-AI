import { promises as fs } from 'fs';
import * as syncFs from 'fs';
import axios from "axios";
import ks from 'node-key-sender';
import screenshot from 'screenshot-desktop';
import * as OpenAIModule from './openai.js';

export { initModule, functionCallable }

const displays = screenshot.listDisplays();
let functionCallable = {}

let openai, keyConfigs;

const useKeybind = async (functionName) => {
    let keybind = keyConfigs[functionName];

    if (keybind.modifier != "") {
        ks.sendCombination([keybind.modifier, keybind.keys[0]]);
    } else {
        ks.sendKeys(keybind.keys);
    }
}

const initModule = async (openaiConf) => {
    openai = openaiConf;
    keyConfigs = await JSON.parse(await fs.readFile("./confs/keybinds.json", "utf-8"));
    let apiKeys = await JSON.parse(await fs.readFile("./confs/api-keys.json", "utf-8"));

    functionCallable = {
        toggle_landinggears: async () => {
            useKeybind("toggle_landinggears");
            return "success";
        },
        request_landing: async () => {
            useKeybind("request_landing");
            return "success";
        },
        toggle_ship: async () => {
            useKeybind("toggle_ship");
            return "success";
        },
        get_latest_prices: async() => { 
            const res = await axios.get('https://uexcorp.space/api/2.0/commodities',
                {
                    headers: {
                        'content-type': 'application/json',
                        'api_key': apiKeys.uexcorp
                    },
                    responseType: 'application/json'
                }
            );

            return JSON.stringify(JSON.parse(res.data).data);
        },
        get_trading: async (params) => {
            params = JSON.parse(params);
            if(params.location === "Unknown" || !params.location) return "Unknown location. Need to know where you are."

            let latestPrices = await functionCallable["get_latest_prices"]();

            await fs.writeFile(`./latestprices.json`, latestPrices);

            let response = await OpenAIModule.runTemporaryAssistant(
                "You are a trade master who understand the art of trading",
                `Find the best trade route from ${params.location} ${ (params.commodities) ? `for ${params.commodities}` : ""} by analyzing this JSON file containing the latest price of different commodities at different places. Answer simply and briefly, clearly stating what is the best trade route.`,
                ["./latestprices.json"]
            )

            return response;
        },
        describe_vision: async () => {
            let finalResponse;

            await screenshot({ filename: './lastImage.jpg' }).then(async (img) => {
                console.log("Taking picture");
                const imageAsBase64 = syncFs.readFileSync("./lastImage.jpg", 'base64');
                let imagesContent = {
                    type: 'image_url',
                    image_url: { url: `data:image/png;base64,${imageAsBase64}` } ,
                }
                console.log("Picture taken")

                const response = await openai.chat.completions.create({
                    model: 'gpt-4o-2024-05-13',
                    messages: [
                        { role: 'system', content: "You roleplay a spaceship AI answering the requests of captain Samuel. Never describe any HUD. Make your answer sounds serious and brief." },
                        {
                            role: 'user',
                            content: [
                                { "type": "text", "text": "Describe this image" },
                                imagesContent,
                            ],
                        },
                    ],
                    max_tokens: 1000,
                });

                finalResponse = response.choices[0].message.content;
            });

            console.log("Vision: ", finalResponse)

            return finalResponse;
        }
    }
}
