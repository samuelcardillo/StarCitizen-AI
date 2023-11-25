# StarCitien AI

Wrote super quickly, as a fun project, this is a wrapper for GPT 4 (including Vision), Whisper, ElevenLabs (and XVASynth) for extremely flexible AI assistants - in this case made for Star Citizen but can be changed for anything/

## Install Star Citizen AI

Install NodeJS and any required dependencies. Then `npm i` and `node index.js` 

Make sure to go in `confs/api-keys.json` to change your API keys for ElevenLabs and OpenAPI.

### API Keys requirements
- OpenAI GPT-4
- ElevenLabs
- UNEXCORP (https://twitter.com/CardilloSamuel/status/1727031996818330020)
- Leave the assistant key empty, a new one will automatically be created by the software

### Fun stuff

- If you go in the personas, you can delete the `threadId` individually, a new one will automatically be generated when relaunched, giving you an entirely clean context to play with
- Assistant tools are updated automatically everytime you launch the code so you can have fun with `confs/tools.js`
- You can use XVASynth instead of ElevenLabs (saves money I guess) by modifying the personas JSON.
- An HTTP(S) server is running automatically on port `:5446` (you can change on `/confs/server.json`) with a working client-server exemple (files in `/webfiles`)

## Add more tools

You can easily add tools in `confs/tools.json` and then the correct function in `openai_functioncalls.js`. The `assistantKey` in the `confs/api-keys.json` is automatically filled.

### Dependencies :
- https://nodejs.org/en/download
- https://sourceforge.net/projects/sox/
- https://www.java.com/fr/download/manual.jsp

### More incoming ! Unsure what yet, but whatever comes in my mind!
What's already planned : 
* Refactoring of the Vision API to be useable in a standalone function
* Adding an interval for uploading files & refactoring of the "temporary assistant" to be able to retrieve existing files (to avoid uplodating/deleting all the time)
