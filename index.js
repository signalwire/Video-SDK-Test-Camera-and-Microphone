async function main() {
  const cameraSelector = document.getElementById('cameraSelector')
  const microphoneSelector = document.getElementById('microphoneSelector')
  const loopbackMic = document.getElementById('loopbackMic')

  const videoElement = document.getElementById('videoElement')
  const audioMeter = document.getElementById('audioMeter')

  loopbackMic.addEventListener('click', () => videoElement.muted = !loopbackMic.checked)

  let media = await SignalWire.WebRTC.getUserMedia({ audio: true, video: true })
  let audioLevelMonitor = null

  async function onDeviceSelectionChanged() {
    const cameraId = cameraSelector.value
    const microphoneId = microphoneSelector.value
  
    audioLevelMonitor?.stop()
    media.getTracks().forEach(track => track.stop());
  
    media = await SignalWire.WebRTC.getUserMedia({
      audio: { deviceId: microphoneId },
      video: { deviceId: cameraId }
    })
  
    videoElement.srcObject = media;
  
    audioLevelMonitor = new AudioLevelMonitor(media, level => audioMeter.value = level)
    audioLevelMonitor.start()
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
    console.log(cam)
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

class AudioLevelMonitor {
  constructor (userMedia, callback) {
    this.userMedia = userMedia
    this.callback = callback
    this._stopped = true
  }

  start() {
    this._stopped = false
    
    const self = this

    var _audioContext   = new AudioContext();
    var _audioAnalyser  = [];
    var _freqs          = [];
    var audioLevels     = [0];
    
    var _audioSource          = _audioContext.createMediaStreamSource(this.userMedia);
    var _audioGain1           = _audioContext.createGain();
    var _audioChannelSplitter = _audioContext.createChannelSplitter(_audioSource.channelCount);
    
    _audioSource.connect(_audioGain1);
    _audioGain1.connect(_audioChannelSplitter);
    // _audioGain1.connect(_audioContext.destination);  // Mute output audio
    
    for (let i = 0; i < _audioSource.channelCount; i++) {
        _audioAnalyser[i]                       = _audioContext.createAnalyser();
        _audioAnalyser[i].minDecibels           = -100;
        _audioAnalyser[i].maxDecibels           = 0;
        _audioAnalyser[i].smoothingTimeConstant = 0.8;
        _audioAnalyser[i].fftSize               = 32;
        _freqs[i]                               = new Uint8Array(_audioAnalyser[i].frequencyBinCount);
    
        _audioChannelSplitter.connect(_audioAnalyser[i], i, 0);
    }
    
    function calculateAudioLevels() {
      setTimeout(() => {
        if (self._stopped) {
          _audioContext.close()
          return
        }

        for (let channelI = 0; channelI < _audioAnalyser.length; channelI++) {
          _audioAnalyser[channelI].getByteFrequencyData(_freqs[channelI]);
          let value = 0;
          for (let freqBinI = 0; freqBinI < _audioAnalyser[channelI].frequencyBinCount; freqBinI++) {
            value = Math.max(value, _freqs[channelI][freqBinI]);
          }
          audioLevels[channelI] = value / 256;
        }
        self.callback(audioLevels.reduce((a, b) => a + b, 0) / audioLevels.length)
        requestAnimationFrame(calculateAudioLevels.bind(this));
      }, 1000 / 15); // Max 15fps — not more needed
    }
  
    calculateAudioLevels()
  }

  stop() {
    this._stopped = true
  }
}

main()