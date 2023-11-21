# StarCitien AI

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

## Add more tools

You can easily add tools in `confs/tools.json` and then the correct function in `openai_functioncalls.js`. The `assistantKey` in the `confs/api-keys.json` is automatically filled.

### Dependencies :
- https://nodejs.org/en/download
- https://sourceforge.net/projects/sox/
- https://www.java.com/fr/download/manual.jsp

### More incoming ! Unsure what yet, but whatever comes in my mind!