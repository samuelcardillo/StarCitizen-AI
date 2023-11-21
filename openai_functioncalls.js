import { promises as fs } from 'fs';
import * as syncFs from 'fs';
import axios from "axios";
import ks from 'node-key-sender';
import screenshot from 'screenshot-desktop';

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
        get_trading: async () => {
            const res = await axios.get('https://portal.uexcorp.space/api/all_prices/pretty_mode/1/',
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
        describe_vision: async () => {
            let finalResponse;

            await screenshot({ filename: './lastImage.jpg' }).then(async (img) => {
                console.log("Taking picture");
                const imageAsBase64 = syncFs.readFileSync("./lastImage.jpg", 'base64');
                let imagesContent = {
                    type: 'image_url',
                    image_url: `data:image/png;base64,${imageAsBase64}`,
                }
                console.log("Picture taken")

                const response = await openai.chat.completions.create({
                    model: 'gpt-4-vision-preview',
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
                    // max_tokens: 1000,
                });

                finalResponse = response.choices[0].message.content;
            });

            console.log("Vision: ", finalResponse)

            return finalResponse;
        }
    }
}
