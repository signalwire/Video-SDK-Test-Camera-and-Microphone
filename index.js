async function main() {
  const cameraSelector = document.getElementById('cameraSelector')
  const microphoneSelector = document.getElementById('microphoneSelector')
  const loopbackMic = document.getElementById('loopbackMic')

  const videoElement = document.getElementById('videoElement')
  const audioMeter = document.getElementById('audioMeter')

  loopbackMic.addEventListener('click', () => videoElement.muted = !loopbackMic.checked)

  let media = await SignalWire.WebRTC.getUserMedia({ audio: true, video: true })
  let micAnalyzer = null

  async function onDeviceSelectionChanged() {
    const cameraId = cameraSelector.value
    const microphoneId = microphoneSelector.value
  
    micAnalyzer?.destroy()
    media.getTracks().forEach(track => track.stop());
  
    media = await SignalWire.WebRTC.getUserMedia({
      audio: { deviceId: microphoneId },
      video: { deviceId: cameraId }
    })
  
    videoElement.srcObject = media;
  
    micAnalyzer = await SignalWire.WebRTC.createMicrophoneAnalyzer(media)
    micAnalyzer.on('volumeChanged', (vol) => {
      audioMeter.value = vol
    })
    micAnalyzer.on('destroyed', (reason) => {
      console.log('Microphone analyzer destroyed', reason)
      audioMeter.value = 0
    })
  }

  cameraSelector.addEventListener('change', onDeviceSelectionChanged);
  microphoneSelector.addEventListener('change', onDeviceSelectionChanged);

  (await SignalWire.WebRTC.createDeviceWatcher()).on('changed', () => refreshDevices())
  await refreshDevices()

  await onDeviceSelectionChanged()
}

async function refreshDevices() {
  const cameraSelector = document.getElementById('cameraSelector')
  const microphoneSelector = document.getElementById('microphoneSelector')

  const cameras = await SignalWire.WebRTC.getCameraDevicesWithPermissions()
  const microphones = await SignalWire.WebRTC.getMicrophoneDevicesWithPermissions()

  cameraSelector.innerHTML = ''
  for (const cam of cameras) {
    const opt = document.createElement('option');
    opt.value = cam.deviceId;
    opt.innerText = cam.label;
    cameraSelector.appendChild(opt);
  }

  microphoneSelector.innerHTML = ''
  for (const mic of microphones) {
    const opt = document.createElement('option');
    opt.value = mic.deviceId;
    opt.innerText = mic.label;
    microphoneSelector.appendChild(opt);
  }
}

main()