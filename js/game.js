const Game = (() => {
  let running=false,paused=false,dead=false,rafId=null;
  let night=1,isCustom=false,customDiff=null;
  let lastT=0,fpsT=0,fpsC=0,fps=60;

  function loop(ts){
    rafId=requestAnimationFrame(loop);
    const dt=Math.min(ts-lastT,100); lastT=ts;
    fpsC++;fpsT+=dt;
    if(fpsT>=500){ fps=Math.round(fpsC/(fpsT/1000)); UI.updateFps(fps); fpsC=0; fpsT=0; }
    if(paused||!running||dead) return;
    Power.update(dt);
    if(Power.isPowered()) AI.update(dt);
    Office.update(dt);
    Cameras.update(dt);
    UI.updateClock(dt);
    UI.updateHallucination(dt);
  }

  async function startNight(n){
    night=n; isCustom=false; dead=false;
    AI.setNight(n); reset(); Power.setNight(n); UI.setNightLabel(n);
    await UI.showNightIntro(n);
    running=true;
    Sound.startLoop('fan','sounds/fan.mp3',.28);
    Sound.startLoop('ambience','sounds/ambience.mp3',.12);
    // Play phone call for nights 1-5
    if(n>=1&&n<=5){
      Sound.playCall(n);
      const btn=document.getElementById('mute-call-btn');
      if(btn){ btn.classList.remove('hidden'); btn.textContent='MUTE CALL'; }
    }
  }

  async function startCustomNight(diff){
    night=0; isCustom=true; customDiff=diff; dead=false;
    AI.setDifficulty(diff.freddy,diff.bonnie,diff.chica,diff.foxy);
    reset(); UI.setNightLabel('Custom');
    await UI.showNightIntro('Custom');
    running=true;
    Sound.startLoop('fan','sounds/fan.mp3',.28);
    Sound.startLoop('ambience','sounds/ambience.mp3',.12);
  }

  function togglePause(){
    if(!running||dead) return;
    paused=!paused; UI.showPause(paused);
    if(paused){
      Sound.stopAllLoops();
      // Pause the phone call (don't stop it, just pause)
      if(Sound.pauseCall) Sound.pauseCall();
    } else {
      Sound.startLoop('fan','sounds/fan.mp3',.28);
      Sound.startLoop('ambience','sounds/ambience.mp3',.12);
      // Resume the phone call
      if(Sound.resumeCall) Sound.resumeCall();
    }
  }

  async function jumpscare(animatronic){
    if(dead||!running) return;
    dead=true; running=false;
    Sound.stopAllLoops(); // stops music_box, fan, ambience
    Sound.stopCall();
    const mcb=document.getElementById('mute-call-btn');
    if(mcb) mcb.classList.add('hidden');
    if(Cameras.isOpen()) Cameras.forceClose();
    await UI.showJumpscare(animatronic);
    await UI.showGameOver(animatronic);
    await UI.fadeOut();
    Menu.returnToMenu();
    await UI.fadeIn();
  }

  async function winNight(){
    if(!running) return;
    running=false;
    Sound.stopAllLoops(); // also stops music_box if it was playing
    Sound.stopCall();
    const mcb=document.getElementById('mute-call-btn');
    if(mcb) mcb.classList.add('hidden');

    // Save star (not for custom)
    if(!isCustom && night>=1){
      let d=Save.load(); d=Save.awardStar(d,night); Save.save(d);
    }

    // Show the proper 6AM animation
    await UI.show6AMScreen();
    await UI.fadeOut();

    // Always go to main menu after winning (custom or not)
    Menu.returnToMenu();
    await UI.fadeIn();
  }

  async function goToMenu(){
    running=false; paused=false; dead=false;
    Sound.stopAll(); Sound.stopAllLoops();
    reset(); Menu.returnToMenu();
  }

  function restartNight(){ isCustom?startCustomNight(customDiff):startNight(night); }
  function reset(){ Office.reset(); Cameras.reset(); AI.reset(); Power.reset(); UI.reset(); }

  function init(){
    Office.init(); Cameras.init();
    Menu.init(); // always last
    lastT=performance.now();
    rafId=requestAnimationFrame(loop);
  }

  return{ init,startNight,startCustomNight,togglePause,jumpscare,getNight:()=>night,isPaused:()=>paused,
          winNight,goToMenu,restartNight,isRunning:()=>running };
})();

window.addEventListener('DOMContentLoaded',()=>Game.init());
