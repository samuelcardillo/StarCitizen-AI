import fs from "fs";
import util from "util";
import { v4 as uuidv4 } from 'uuid';
import axios from 'axios';
import stream from 'stream';

export { exportSpeech, initModule }

const pipeline = util.promisify(stream.pipeline);

let xApiKey;

const initModule = async(apikey) => {
  xApiKey = apikey;
}

const exportSpeech = async (text, voiceId) => {
  let options = {
    "text": text,
    "voice_settings": {
      "stability": 0.7,
      "similarity_boost": 1
    },
    "model_id": "eleven_multilingual_v2",
  }

  const res = await axios.post(`https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`, options, {
    headers: {
      'content-type': 'application/json',
      'xi-api-key': xApiKey
    },
    responseType: 'stream'
  }).catch((e) => {
    console.dir(e);
  })

  let uuid = uuidv4();

  await pipeline(res.data, fs.createWriteStream(`./voiceMsgs/${uuid}.mp3`));

  return `${uuid}.mp3`;
}