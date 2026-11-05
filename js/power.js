// Authentic FNAF 1 power system
// Internal power: 0-999, displayed as percentage (999=100%, 4=0%)
// Night passive drain and per-second usage drain

const Power = (() => {
  // Internal state
  let internal = 999;  // 0-999
  let on = true;
  let night = 1;

  // Active systems tracking (each adds to usage level)
  let active = {};
  // RATES: how many usage levels each system adds
  const USAGE_COST = {
    'camera':1, 'light-left':1, 'light-right':1,
    'door-left':1, 'door-right':1
  };

  // Timers
  let secAccum = 0;       // accumulates ms → fires every 1000ms
  let passiveAccum = 0;   // accumulates ms → fires every N seconds

  // Passive drain interval by night (ms between -1 passive drains)
  const PASSIVE_INTERVAL = { 1:null, 2:6000, 3:5000, 4:4000, 5:3000, 6:3000, 7:3000 };

  function setUsage(s, v){
    if(v) active[s]=true; else delete active[s];
  }

  // Usage level = 1 (base) + number of active systems, capped at 5
  function getLevel(){
    const n = Object.keys(active).length;
    return Math.min(5, 1 + n);
  }

  function getPercentage(){
    return Math.round((internal / 999) * 100);
  }

  function drain(extraInternal){ internal = Math.max(0, internal - extraInternal); }

  function update(dt){
    if(!on) return;

    // Per-second drain: usage level internal units per second
    secAccum += dt;
    if(secAccum >= 1000){
      secAccum -= 1000;
      internal -= getLevel();
      if(internal <= 0){ internal=0; outage(); return; }
    }

    // Passive drain (starts night 2)
    const passInt = PASSIVE_INTERVAL[night];
    if(passInt){
      passiveAccum += dt;
      if(passiveAccum >= passInt){
        passiveAccum -= passInt;
        internal -= 1;
        if(internal <= 0){ internal=0; outage(); return; }
      }
    }

    UI.updatePowerHUD(getPercentage(), getLevel());
  }

  function outage(){
    if(!on) return;
    on = false;
    Sound.play('powerdown', .8);
    Sound.stopAllLoops();
    Cameras.forceClose();
    active = {};
    Office.setPowered(false);
    AI.onPowerOut();
    UI.updatePowerHUD(0, 0); // power out
  }

  function setNight(n){ night = n; passiveAccum = 0; }

  function reset(){
    internal = 999; active = {}; on = true;
    secAccum = 0; passiveAccum = 0;
  }

  function isPowered(){ return on; }
  function getPower()  { return internal; }

  return { setUsage, drain, update, reset, isPowered, getPower, setNight,
           getPercentage(){ return Math.round((internal/999)*100); } };
})();
