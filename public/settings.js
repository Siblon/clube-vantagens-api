const DEFAULTS = {
  "readerMode": "wedge",
  "autoConsultOnScan": true,
  "autoRegisterAfterConsult": false,
  "focusValueAfterConsult": true,
  "beepOnScan": true,
  "clearCpfAfterRegister": true,
  "keepValueAfterRegister": false,
  "qrCameraId": "",
  "wedgeDebounceMs": 40,
  "scanMinLength": 11,
  "idPattern": "^C\\\d{7}$"
};

const Settings = {
  defaults: DEFAULTS,
  load(){
    try{
      const raw = localStorage.getItem('cv_prefs_v1');
      const obj = raw ? JSON.parse(raw) : {};
      return { ...DEFAULTS, ...obj };
    }catch(_){
      return { ...DEFAULTS };
    }
  },
  save(prefs){
    try{ localStorage.setItem('cv_prefs_v1', JSON.stringify(prefs)); }catch(_){ }
  },
  apply(prefs){
    const p = { ...DEFAULTS, ...prefs };
    window.cvPrefs = p;
    if (window.setReaderMode) window.setReaderMode(p.readerMode);
    if (window.configureWedge) window.configureWedge({ debounceMs: p.wedgeDebounceMs, minLen: p.scanMinLength, beep: p.beepOnScan });
  },
  async enumerateCameras(){
    try{
      const devices = await navigator.mediaDevices.enumerateDevices();
      return devices.filter(d => d.kind === 'videoinput');
    }catch(_){
      return [];
    }
  },
  beep(){
    try{
      const ctx = new (window.AudioContext||window.webkitAudioContext)();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.value = 880;
      osc.connect(gain);
      gain.connect(ctx.destination);
      gain.gain.setValueAtTime(0.1, ctx.currentTime);
      osc.start();
      osc.stop(ctx.currentTime + 0.08);
    }catch(_){ }
  }
};

window.Settings = Settings;
