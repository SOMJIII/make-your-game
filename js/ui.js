const UI = (() => {
  const hudTime  = document.getElementById('hud-time');
  const hudNight = document.getElementById('hud-night-num');
  const hudFps   = document.getElementById('hud-fps');
  const hudPct   = document.getElementById('hud-pct');
  const hudUsg   = document.getElementById('hud-usage');
  const pauseM   = document.getElementById('pause-menu');
  const jumpO    = document.getElementById('jumpscare-overlay');
  const jumpI    = document.getElementById('jumpscare-img');
  const hallu    = document.getElementById('hallucination');
  const nightIntro = document.getElementById('night-intro');
  const nightIntroN = document.getElementById('night-intro-num');
  const ctrlHint = document.getElementById('controls-hint');
  const winSc    = document.getElementById('win-screen');
  const winSub   = document.getElementById('win-sub');
  const fadeEl   = document.getElementById('fade-overlay');
  const sg       = document.getElementById('screen-game');

  const HOURS=['12 AM','1 AM','2 AM','3 AM','4 AM','5 AM','6 AM'];
  const NIGHT_MS=8*60*1000, HOUR_MS=NIGHT_MS/6;
  let elapsed=0, hour=0, paused=false, halluT=90000+Math.random()*60000; // start after 1.5-2.5min

  const JIMGS={
    freddy:'graphics/jumpscares/freddy.webp',
    bonnie:'graphics/jumpscares/bonnie.webp',
    chica: 'graphics/jumpscares/chica.webp',
    foxy:  'graphics/jumpscares/foxy.gif',
    golden_freddy:'graphics/jumpscares/golden_freddy.webp',
  };

  function updateClock(dt){
    elapsed+=dt;
    const h=Math.min(6,Math.floor(elapsed/HOUR_MS));
    if(h!==hour){
      hour=h; hudTime.textContent=HOURS[h];
      // Update AI levels every 2 hours (authentic FNAF behavior)
      if(typeof AI!=='undefined'&&typeof Game!=='undefined')
        AI.onHourChange&&AI.onHourChange(Game.getNight?.()??1, h);
      if(h===6){ Sound.play('chimes',.7); Game.winNight(); }
    }
  }

  const UB_COLORS=['#00cc00','#00cc00','#cccc00','#ff6600','#cc0000'];
  function updatePowerHUD(pct,lvl){
    hudPct.textContent=Math.floor(pct);
    let html='';
    for(let i=0;i<lvl;i++){
      const col=UB_COLORS[Math.min(i,UB_COLORS.length-1)];
      html+=`<span class="ub" style="background:${col}"></span>`;
    }
    hudUsg.innerHTML=html;
  }

  function updateFps(fps){
    hudFps.textContent=fps+' FPS';
    hudFps.style.color=fps>=55?'#2a2a2a':fps>=40?'#886600':'#cc0000';
  }
  function setNightLabel(n){ hudNight.textContent=n; }

  function showNightIntro(n){
    return new Promise(r=>{
      const officeLayer = document.getElementById('office-layer');
      if(officeLayer) officeLayer.style.visibility='hidden';

      // Fade in from black NOW (showing controls hint, not office)
      const fade=document.getElementById('fade-overlay');
      ctrlHint.classList.remove('hidden');
      if(fade){
        fade.style.transition='opacity 0.35s ease';
        fade.style.opacity='0';
        fade.style.pointerEvents='none';
      }

      setTimeout(()=>{
        ctrlHint.classList.add('hidden');
        nightIntroN.textContent=n;
        nightIntro.classList.remove('hidden');
        setTimeout(()=>{
          nightIntro.classList.add('hidden');
          // Restore office and all HUD
          if(officeLayer) officeLayer.style.visibility='visible';
          ['hud-time-box','hud-power-box','cam-handle','hud-fps'].forEach(id=>{
            const el=document.getElementById(id);
            if(el) el.style.visibility='visible';
          });
          r();
        },2000);
      },2200);
    });
  }

  function showPause(v){ paused=v; pauseM.classList.toggle('hidden',!v); }
  function isPaused(){ return paused; }

  document.getElementById('p-resume').addEventListener('click',()=>Game.togglePause());
  document.getElementById('p-restart').addEventListener('click',()=>{ showPause(false); Game.restartNight(); });
  document.getElementById('p-menu').addEventListener('click',()=>{ showPause(false); Game.goToMenu(); });
  document.addEventListener('keydown',e=>{
    if(e.key==='Escape'&&document.getElementById('screen-game').classList.contains('active'))
      Game.togglePause();
  });

  function showJumpscare(animatronic){
    return new Promise(r=>{
      jumpI.src=JIMGS[animatronic]||JIMGS.freddy;
      jumpO.classList.remove('hidden');
      Sound.stopAll(); Sound.stopAllLoops(); Sound.play('scream2',.7);
      Sound.play('scream',.9);
      sg.classList.add('shaking');
      sg.addEventListener('animationend',()=>sg.classList.remove('shaking'),{once:true});
      setTimeout(()=>{ jumpO.classList.add('hidden'); r(); },1500);
    });
  }

  function showGameOver(animatronic){
    return new Promise(r=>{
      const goScreen=document.getElementById('screen-gameover');
      const goHallway=document.getElementById('go-hallway');
      goHallway.src=JIMGS[animatronic]||JIMGS.bonnie;
      document.querySelectorAll('.screen').forEach(s=>s.classList.remove('active'));
      goScreen.classList.add('active');
      // Phase 1: full-screen static + glitch effect
      goScreen.classList.add('go-glitch');
      setTimeout(()=>{
        // Phase 2: fade static away, show dark hallway
        goScreen.classList.remove('go-glitch');
        goScreen.classList.add('go-phase2');
        setTimeout(()=>{ goScreen.classList.remove('go-phase2'); r(); },4500);
      },2800);
    });
  }

  function show6AMScreen(){
    return new Promise(r=>{
      // Use the official victory.gif/webp - same as real game
      const win6=document.getElementById('win-6am-screen');
      document.querySelectorAll('.screen').forEach(s=>s.classList.remove('active'));
      win6.classList.add('active');
      // Show victory image fullscreen
      const img=document.getElementById('win-victory-img');
      if(img){
        img.src='graphics/ui/victory.gif';
        img.style.display='block';
      }
      Sound.play('chimes',.8);
      // victory.gif is 10.8 seconds - play the whole thing
      setTimeout(()=>{
        win6.classList.remove('active');
        if(img){ img.style.display='none'; img.src=''; }
        r();
      },11000);
    });
  }

  function updateHallucination(dt){
    // Only in office (not in cameras), rare
    if(typeof Cameras!=='undefined'&&Cameras.isOpen()) return;
    halluT-=dt;
    if(halluT<=0){
      halluT=120000+Math.random()*180000;
      if(Math.random()<.08){
        hallu.classList.remove('hidden');
        setTimeout(()=>hallu.classList.add('hidden'),60+Math.random()*60);
      }
    }
  }

  function showWin(night,onNext,onMenu){
    winSc.classList.remove('hidden');
    winSub.textContent=night>=7?'Congratulations, you monster.':'You survived the night!';
    document.getElementById('btn-win-next').onclick=()=>{ winSc.classList.add('hidden'); onNext(); };
    document.getElementById('btn-win-menu').onclick=()=>{ winSc.classList.add('hidden'); onMenu(); };
  }

  function fadeOut(){return new Promise(r=>{fadeEl.classList.add('fading');setTimeout(r,420);})}
  function fadeIn() {return new Promise(r=>{fadeEl.classList.remove('fading');setTimeout(r,420);})}

  function reset(){
    elapsed=0; hour=0; paused=false; halluT=90000+Math.random()*60000; // first hallucination check after 1.5-2.5 min
    hudTime.textContent=HOURS[0];
    [winSc,jumpO,nightIntro,pauseM,ctrlHint].forEach(el=>{ if(el) el.classList.add('hidden'); });
    if(hallu) hallu.classList.add('hidden');
    if(hudUsg) hudUsg.innerHTML='';
  }

  return{ reset,updateClock,updatePowerHUD,updateFps,setNightLabel,
          showNightIntro,showPause,isPaused,showJumpscare,showGameOver,
          show6AMScreen,updateHallucination,showWin,fadeOut,fadeIn,getHour:()=>hour };
})();
