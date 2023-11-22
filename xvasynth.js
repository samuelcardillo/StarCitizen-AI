

import { v4 as uuidv4 } from 'uuid';
import process from "process";
import axios from 'axios';

export { exportSpeech }

let lastModel = "";

const loadModel = async (ttsParams) => {
    modelName = ttsParams.model.split(".hg.pt")[0];
    let options = {
        "outputs":null,
        "model":`${ttsParams.installPath}/resources/app/models/${modelName}`,
        "modelType":"FastPitch1.1",
        "version":"2.0",
        "base_lang":"en",
        "pluginsContext":"{}"
    }

    const res = await axios.post(`http://127.0.0.1:8008/loadModel`, options, {
        headers: {
          'content-type': 'application/json',
        },
        responseType: 'application/json'
    }).catch((e) => {
        console.log("Error changing model");
    })

    return true;
}

const exportSpeech = async (text, ttsParams) => {
    let uuid = uuidv4();
    let path = `${process.cwd()}\\voiceMsgs\\${uuid}.mp3`;

    console.log(process.cwd())
    await loadModel(ttsParams.model);
    console.log(ttsParams.model, "loaded")

    let options = { 
        "sequence": text, 
        "pitch": [], 
        "duration": [], 
        "energy": [], 
        "emAngry": [], 
        "emHappy": [], 
        "emSad": [], 
        "emSurprise": [], 
        "editorStyles": {}, 
        "pace": "1", 
        "base_lang": "en", 
        "base_emb": "Default", 
        "modelType": ttsParams.modelType, 
        "device": "cuda:0", 
        "useSR": false, 
        "useCleanup": true, 
        "outfile": path, 
        "pluginsContext": "{}",
        "vocoder": ttsParams.model, 
        "waveglowPath": `${ttsParams.installPath}/resources/app/models/nvidia_waveglowpyt_fp32_20190427.pt` 
    }

    const res = await axios.post(`http://127.0.0.1:8008/synthesize`, options, {
        headers: {
          'content-type': 'application/json',
        },
        responseType: 'application/json'
    }).catch((e) => {
        console.log("Error generating audio");
    })

    return `${uuid}.mp3`;
}