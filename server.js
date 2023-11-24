import { promises as fs } from 'fs';
import * as syncFs from 'fs';
import express from 'express';
import bodyParser from 'body-parser';
import http from 'http';
import https from 'https';
import multer from "multer";
import * as OpenAIModule from './openai.js';

export { initModule }

let app = express();
let server;
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, './voiceMsgs/')
    },
    filename: (req, file, cb) => {
        cb(null, 'userInput.wav')
    }
})
const upload = multer({ storage: storage });

app.use(express.static('./webfile/'));
app.use(bodyParser.json({ limit: '2mb' }));       // to support JSON-encoded bodies
app.use(bodyParser.urlencoded({ extended: true, limit: '2mb' }));   // to support URL-encoded bodies
app.use(function (req, res, next) {
    // Website you wish to allow to connect
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader("Access-Control-Allow-Headers", "X-Requested-With, Content-Type");
    res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS, PUT");
    next();
});

const initModule = async () => {
    let serverConfig = JSON.parse(await fs.readFile("./confs/server.json", "utf-8"));
    
    if(!serverConfig.enable) return console.log("[X] HTTP(S) Server was not enabled.");

    if(serverConfig.ssl.enable) { 
        const sslOptions = {
            key: fs.readFileSync(serverConfig.ssl.key),
            cert: fs.readFileSync(serverConfig.ssl.cert)
        };
        https.createServer(sslOptions, app).listen(serverConfig.port);

    } else {
        http.createServer(app).listen(serverConfig.port);
    }

    console.log(`${(serverConfig.ssl.enable) ? "HTTPS" : "HTTP"} Server intialized on port ${serverConfig.port}`);

}
app.post('/audio', upload.single('audio'), async (req, res) => {
    let assistantName = req.body.assistantName;

    let persona = await JSON.parse(await fs.readFile(`./confs/personas/${assistantName}.json`, "utf-8"));
    let userInput = await OpenAIModule.transcribeAudio("voiceMsgs/userInput.wav");
    console.log("You: ", userInput);
    let response = await OpenAIModule.createCompletion(userInput, persona.threadId, persona.tts, persona.instruction);
    console.log("AI : ", response);
    return res.status(200).send(response);
})


app.post('/text', async (req, res) => {
    let userInput = req.body.userInput;
    let assistantName = req.body.assistantName;
    let persona = await JSON.parse(await fs.readFile(`./confs/personas/${assistantName}.json`, "utf-8"));

    let response = await OpenAIModule.createCompletion(userInput, persona.threadId, persona.tts, persona.instruction);
    console.dir(response);

    return res.status(200).send({});
})

app.get("/audio/:audioName", async (req, res) => {
    const filepath = `./voiceMsgs/${req.params.audioName}`;
    const stat = syncFs.statSync(filepath);

    res.writeHead(200, {
        'content-type': 'audio/mpeg',
        'content-length': stat.size
    });

    const readstream = syncFs.createReadStream(filepath);
    readstream.pipe(res);
})