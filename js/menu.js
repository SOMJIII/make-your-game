const Menu = (() => {
  const fadeEl = document.getElementById('fade-overlay');
  const miItems = ['mi-new','mi-continue','mi-night6','mi-custom'];
  const cvVals = { freddy:0, bonnie:0, chica:0, foxy:0 };

  // Single reliable fade helper - direct style manipulation
  function blackOut(){
    fadeEl.style.transition='none';
    fadeEl.style.opacity='1';
    fadeEl.style.pointerEvents='all';
    return new Promise(r=>setTimeout(r,60));
  }
  function fadeIn(){
    fadeEl.style.transition='opacity 0.35s ease';
    fadeEl.style.opacity='0';
    fadeEl.style.pointerEvents='none';
    return new Promise(r=>setTimeout(r,380));
  }

  // Custom in-page confirm dialog — returns a Promise<boolean>
  function showConfirm(msg){
    return new Promise(resolve=>{
      const dialog = document.getElementById('confirm-dialog');
      const msgEl  = document.getElementById('confirm-msg');
      const yesBtn = document.getElementById('confirm-yes');
      const noBtn  = document.getElementById('confirm-no');
      if(!dialog){ resolve(window.confirm(msg)); return; }
      msgEl.textContent = msg;
      dialog.classList.remove('hidden');
      // Focus the NO button by default (safer)
      noBtn.focus();
      function cleanup(result){
        dialog.classList.add('hidden');
        yesBtn.removeEventListener('click', onYes);
        noBtn .removeEventListener('click', onNo);
        resolve(result);
      }
      function onYes(){ cleanup(true);  }
      function onNo() { cleanup(false); }
      yesBtn.addEventListener('click', onYes);
      noBtn .addEventListener('click', onNo);
    });
  }

  // Show a screen by ID, clearing all others completely
  function showScreen(id){
    document.querySelectorAll('.screen').forEach(s=>{
      s.classList.remove('active');
      s.removeAttribute('style'); // clear ALL inline styles
    });
    const el = document.getElementById(id);
    if(el) el.classList.add('active');
  }

  // Show custom night specifically (needs flex)
  function showCustom(){
    // Hide all screens
    document.querySelectorAll('.screen').forEach(s=>{
      s.classList.remove('active');
      s.style.cssText='';
    });
    const cs = document.getElementById('screen-custom');
    if(!cs){ console.error('screen-custom not found!'); return; }
    cs.classList.add('active');
    cs.style.cssText=
      'display:flex !important;'+
      'flex-direction:column !important;'+
      'align-items:center !important;'+
      'justify-content:center !important;'+
      'gap:20px !important;'+
      'padding-bottom:60px !important;'+
      'background:#000 !important;'+
      'color:#fff !important;'+
      'position:absolute !important;'+
      'top:0 !important;left:0 !important;'+
      'width:100% !important;height:100% !important;'+
      'z-index:1 !important;';
    // Also force children visible
    cs.querySelectorAll('*').forEach(el=>{
      if(el.style.display==='none') el.style.display='';
    });
  }

  function selectItem(i){
    miItems.forEach((id,j)=>{
      const el=document.getElementById(id);
      if(el) el.classList.toggle('sel',j===i);
    });
  }

  function updateMenuFromSave(){
    const d=Save.load();
    for(let i=1;i<=6;i++){
      const el=document.getElementById('mstar-'+i);
      if(el){ const e=Save.hasStar(d,i); el.classList.toggle('hidden',!e); el.classList.toggle('earned',e); }
    }
    const sub=document.getElementById('mi-continue-sub');
    if(sub) sub.textContent='Night '+d.night;
    const n6=document.getElementById('mi-night6');
    if(n6) n6.style.opacity=Save.isNightUnlocked(d,6)?'1':'0.35';
  }

  // Wrap 0-20 with wrapping: 0 → back = 20, 20 → forward = 0
  function updateCV(char,dir){
    let v = cvVals[char]+dir;
    if(v < 0) v=20;
    if(v > 20) v=0;
    cvVals[char]=v;
    const el=document.getElementById('cv-'+char);
    if(el) el.textContent=v;
  }

  // Menu Freddy glitch
  const JIMGS=['graphics/menu/freddy_r1.png','graphics/menu/freddy_r2.png','graphics/menu/freddy_r3.png'];
  const mj=document.getElementById('menu-jump');
  let jTimer=null, jHide=null;
  function startMenuMusic(){
    Sound.startTitleMusic&&Sound.startTitleMusic();
  }
  function stopMenuMusic(){
    Sound.stopTitleMusic&&Sound.stopTitleMusic();
  }

  async function trigger1987(){
    stopGlitch();
    stopMenuMusic();
    await blackOut();
    showScreen('screen-game');
    const ol=document.getElementById('office-layer');
    if(ol) ol.style.visibility='hidden';
    // Show golden freddy FIRST while still blacked out, then fade in over it
    const audio = Sound.play('golden_freddy',0.8);
    const js=document.getElementById('jumpscare-overlay');
    const ji=document.getElementById('jumpscare-img');
    if(js&&ji){
      ji.src='graphics/jumpscares/golden_freddy.webp';
      js.classList.remove('hidden');
    }
    // Now fade in revealing ONLY the jumpscare image
    await fadeIn();
    // Wait for audio to finish (9.35s), then 1 extra second, then dismiss
    await new Promise(r=>{
      if(audio){
        audio.addEventListener('ended',()=>setTimeout(r,1000),{once:true});
      } else {
        setTimeout(r, 10350); // 9.35s + 1s fallback
      }
    });
    if(js) js.classList.add('hidden');
    if(ji) ji.src='';
    await blackOut();
    showScreen('screen-menu');
    updateMenuFromSave(); selectItem(0);
    await fadeIn();
    scheduleGlitch();
    startMenuMusic();
  }

  function scheduleGlitch(){
    jTimer=setTimeout(()=>{
      const alt=JIMGS[Math.floor(Math.random()*JIMGS.length)];
      if(mj){ mj.src=alt; mj.classList.remove('hidden'); }
      jHide=setTimeout(()=>{ if(mj) mj.classList.add('hidden'); scheduleGlitch(); },100+Math.random()*200);
    },10000+Math.random()*20000);
  }
  function stopGlitch(){ clearTimeout(jTimer); clearTimeout(jHide); if(mj) mj.classList.add('hidden'); }

  // Navigation
  async function goToNight(n){
    stopGlitch();
    stopMenuMusic();
    await blackOut();
    showScreen('screen-game');
    // Hide ALL game UI before revealing anything
    const ol=document.getElementById('office-layer');
    if(ol) ol.style.visibility='hidden';
    // Hide HUD elements that would flash
    ['hud-time-box','hud-power-box','cam-handle','hud-fps'].forEach(id=>{
      const el=document.getElementById(id);
      if(el) el.style.visibility='hidden';
    });
    // Don't fadeIn here — showNightIntro will reveal when ready
    Game.startNight(n);
  }

  async function goToCustomGame(){
    stopGlitch();
    stopMenuMusic();
    await blackOut();
    showScreen('screen-game');
    const ol=document.getElementById('office-layer');
    if(ol) ol.style.visibility='hidden';
    ['hud-time-box','hud-power-box','cam-handle','hud-fps'].forEach(id=>{
      const el=document.getElementById(id);
      if(el) el.style.visibility='hidden';
    });
    Game.startCustomNight({...cvVals});
  }

  async function goToCustomScreen(){
    stopGlitch();
    await blackOut();
    showCustom();
    await fadeIn();
  }

  async function goToMenu(){
    await blackOut();
    showScreen('screen-menu');
    updateMenuFromSave(); selectItem(0);
    await fadeIn();
    scheduleGlitch();
  }

  async function returnToMenu(){
    await blackOut();
    showScreen('screen-menu');
    updateMenuFromSave(); selectItem(0);
    await fadeIn();
    scheduleGlitch();
    startMenuMusic();
  }

  function init(){
    Sound.preload();
    showScreen('screen-menu');
    updateMenuFromSave(); selectItem(0);

    // Menu item clicks
    const handlers={
      'mi-new': async ()=>{
        const d=Save.load();
        if(d.night>1||d.stars>0){
          const ok=await showConfirm('Start a new game?\nYour current progress (Night '+d.night+') will be lost.');
          if(!ok) return;
        }
        Save.reset(); goToNight(1);
      },
      'mi-continue': ()=>{ const d=Save.load(); goToNight(d.night); },
      'mi-night6': ()=>{ const d=Save.load(); if(Save.isNightUnlocked(d,6)) goToNight(6); },
      'mi-custom': ()=>goToCustomScreen(),
    };
    for(const [id,fn] of Object.entries(handlers)){
      const el=document.getElementById(id);
      if(el) el.addEventListener('click',()=>{ Sound.play('glitch',.25); fn(); });
    }

    // Hover selector
    miItems.forEach((id,i)=>{
      const el=document.getElementById(id);
      if(el) el.addEventListener('mouseenter',()=>{
        selectItem(i);
        Sound.play('glitch',.2); // UI feedback sound
      });
    });

    // Custom night controls
    document.querySelectorAll('.cc-btn').forEach(btn=>{
      btn.addEventListener('click',()=>updateCV(btn.dataset.c,parseInt(btn.dataset.d)));
    });

    // READY button
    const ready=document.getElementById('btn-custom-ready');
    if(ready) ready.addEventListener('click',()=>{
      // 1987 Easter Egg: 1-9-8-7 triggers Golden Freddy
      if(cvVals.freddy===1&&cvVals.bonnie===9&&cvVals.chica===8&&cvVals.foxy===7){
        trigger1987();
        return;
      }
      goToCustomGame();
    });

    // BACK button
    const back=document.getElementById('btn-custom-back');
    if(back) back.addEventListener('click',()=>goToMenu());

    scheduleGlitch();
    startMenuMusic();
  }

  return { init, returnToMenu };
})();
