document.addEventListener('DOMContentLoaded', () => {
  const startButton = document.getElementById("startButton");
  const audioPlayer = document.getElementById("player");
  let mediaRecorder;
  let recording = false;

  startButton.addEventListener("click", () => {
    if (!recording) {
      navigator.mediaDevices
        .getUserMedia({ audio: true, video: false })
        .then(startRecording)
      startButton.innerHTML = "STOP";
    } else {
      mediaRecorder.stop();
      startButton.innerHTML = "START";

    }
    recording = !recording;
  })

  const startRecording = function (stream) {
    const options = { mimeType: 'audio/webm' };
    const recordedChunks = [];
    mediaRecorder = new MediaRecorder(stream, options);

    mediaRecorder.addEventListener('dataavailable', function (e) {
      if (e.data.size > 0) recordedChunks.push(e.data);
    });

    mediaRecorder.addEventListener('stop', async () => {
      let audioBlob = new Blob(recordedChunks);
      let fd = new FormData();
      fd.append('audio', audioBlob);
      fd.append('assistantName', "onboard-computer");

      let response = await fetch(`${window.location.href}audio`, {
        headers: { Accept: "application/json" },
        method: "POST", body: fd
      });
      response = await response.json();

      audioPlayer.src = `${window.location.href}audio/${response.audio}`;
    });

    mediaRecorder.start();
  };
});
