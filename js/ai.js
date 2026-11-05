const AI = (() => {
  // Per-night AI schedules (updates at 12AM, 2AM, 4AM)
  const NIGHT_AI = {
    1: { 0:{f:0,b:0,c:0,fx:0}, 2:{f:0,b:1,c:0,fx:0}, 4:{f:0,b:2,c:1,fx:1} },
    2: { 0:{f:0,b:3,c:1,fx:1}, 2:{f:0,b:5,c:2,fx:2}, 4:{f:0,b:6,c:3,fx:3} },
    3: { 0:{f:1,b:5,c:4,fx:4}, 2:{f:1,b:7,c:5,fx:5}, 4:{f:2,b:8,c:6,fx:6} },
    4: { 0:{f:2,b:8,c:6,fx:8}, 2:{f:3,b:10,c:8,fx:10},4:{f:4,b:12,c:10,fx:12} },
    5: { 0:{f:3,b:12,c:10,fx:12},2:{f:5,b:14,c:12,fx:14},4:{f:6,b:16,c:14,fx:16} },
    6: { 0:{f:14,b:16,c:16,fx:16},2:{f:16,b:18,c:18,fx:18},4:{f:18,b:20,c:20,fx:20} },
    7: { 0:{f:20,b:20,c:20,fx:20} },
  };

  // ── CORRECT PATHS (index 0 = office/door) ──
  // Bonnie: Show Stage → Dining Area or Backstage → W.Hall → W.Hall Corner → Left Door
  // Can SKIP rooms (random subset of path)
  const BONNIE_PATH = ['office','2B','2A','1C','1B','1A'];
  // Chica: Show Stage → Dining → Restrooms → Kitchen → E.Hall → E.Hall Corner → Right Door
  // STRICT sequence, no skipping
  const CHICA_PATH  = ['office','4B','4A','6','7','1B','1A'];
  // Freddy: Same path as Chica
  const FREDDY_PATH = ['office','4B','4A','6','7','1B','1A'];
  // Foxy: Pirate Cove stages → W.Hall → Left Door (handled separately)

  const MO_INTERVAL = 5000;

  const st = {
    freddy:{ room:'1A', pathIdx:6, ai:0, timer:0, atDoor:false },
    bonnie:{ room:'1A', pathIdx:6, ai:0, timer:0, atDoor:false },
    chica: { room:'1A', pathIdx:6, ai:0, timer:0, atDoor:false },
  };
  const foxy = {
    ai:0, stage:0, timer:0, running:false,
    // Power drain per hit: 1%, 6%, 11%, 16%... (+5% each time)
    hitCount:0
  };

  // Foxy pirate cove camera images (stage 0-3)
  const FOXY_CAM = [
    'graphics/cameras/2a.webp',
    'graphics/cameras/2a_1.webp',
    'graphics/cameras/2a_2.webp',
    'graphics/cameras/2a_3.webp',
  ];
  function getFoxyCameraImage(){ return FOXY_CAM[Math.min(foxy.stage,3)]; }

  function roll(ai){ return Math.floor(Math.random()*20)+1 <= ai; }

  // ── BONNIE: can skip rooms (original game behavior) ──
  function moveBonnie(){
    const s=st.bonnie; if(s.atDoor) return;
    const skip = Math.random()<0.4 ? 2 : 1;
    const newIdx = Math.max(0, s.pathIdx - skip);
    s.pathIdx = newIdx;
    s.room = BONNIE_PATH[newIdx];
    Sound.maybeSteps();
    Cameras.refreshFeed&&Cameras.refreshFeed();
    if(newIdx===0) onReachDoor('bonnie');
  }

  // ── CHICA/FREDDY: strict one-room-at-a-time ──
  function moveCloser(name, path){
    const s=st[name]; if(s.atDoor||s.pathIdx<=0) return;
    s.pathIdx--;
    s.room=path[s.pathIdx];
    Sound.maybeSteps();
    if(name==='freddy') Sound.playFreddyLaugh();
    Cameras.refreshFeed&&Cameras.refreshFeed();
    if(s.pathIdx===0) onReachDoor(name);
  }

  function onReachDoor(name){
    const os=Office.getState();
    const doorClosed = name==='bonnie'?os.doorL:os.doorR;
    if(!doorClosed){
      // At door with door open → wait for next MO then attack
      st[name].atDoor=true;
      scheduleAttack(name);
    } else {
      Sound.play('door_bang',.8);
      Sound.play('knock',.7);
      setTimeout(()=>retreat(name), 2500+Math.random()*3000);
    }
  }

  function scheduleAttack(name){
    setTimeout(()=>{
      if(!Game.isRunning()||!st[name]?.atDoor) return;
      const os=Office.getState();
      const doorClosed = name==='bonnie'?os.doorL:os.doorR;
      if(!doorClosed){
        Game.jumpscare(name);
      } else {
        Sound.play('door_bang',.8);
        Sound.play('knock',.7);
        st[name].atDoor=false;
        setTimeout(()=>retreat(name), 2000+Math.random()*3000);
      }
    }, MO_INTERVAL+Math.random()*2000);
  }

  function retreat(name){
    const path=name==='bonnie'?BONNIE_PATH:name==='chica'?CHICA_PATH:FREDDY_PATH;
    st[name].pathIdx=path.length-1;
    st[name].room=path[st[name].pathIdx];
    st[name].atDoor=false;
    Cameras.refreshFeed&&Cameras.refreshFeed();
  }

  function updateStandard(name, path, dt, moveFn){
    const s=st[name]; if(s.ai===0||s.atDoor) return;
    s.timer+=dt;
    if(s.timer<MO_INTERVAL) return;
    s.timer=0;
    if(roll(s.ai)) moveFn();
  }

  function updateFreddy(dt){
    const s=st.freddy; if(s.ai===0||s.atDoor) return;
    // Freddy freezes while being watched on camera
    if(Cameras.isOpen()&&Cameras.getCurrentRoom()===s.room){ s.timer=0; return; }
    s.timer+=dt;
    if(s.timer<MO_INTERVAL) return;
    s.timer=0;
    if(roll(s.ai)) moveCloser('freddy',FREDDY_PATH);
  }

  function updateFoxy(dt){
    if(foxy.ai===0||foxy.running) return;
    if(Cameras.isOpen()) return; // ANY camera open stalls Foxy
    foxy.timer+=dt;
    if(foxy.timer<MO_INTERVAL) return;
    foxy.timer=0;
    if(roll(foxy.ai)){
      foxy.stage=Math.min(3,foxy.stage+1);
      Cameras.refreshFeed&&Cameras.refreshFeed();
      if(foxy.stage>=3) startFoxyRun();
    }
  }

  function startFoxyRun(){
    foxy.running=true;
    Sound.play('steps',.9);
    Office.showAtDoor('foxy',true);
    const sg=document.getElementById('screen-game');
    sg.classList.add('shaking');
    sg.addEventListener('animationend',()=>sg.classList.remove('shaking'),{once:true});
    setTimeout(()=>{
      if(!Game.isRunning()){foxy.running=false;return;}
      Office.showAtDoor('foxy',false);
      const os=Office.getState();
      if(os.doorL){
        Sound.play('door_bang',.9);
        Sound.play('knock',.8);
        // Power drain: 1%, 6%, 11%, 16%... (1 + hitCount*5 in internal units)
        const drainPct = 1 + foxy.hitCount * 5;
        Power.drain(Math.round(drainPct * 999 / 100));
        foxy.hitCount++;
        foxy.stage=0; foxy.running=false; foxy.timer=0;
        Cameras.refreshFeed&&Cameras.refreshFeed();
      } else {
        Game.jumpscare('foxy');
      }
    },1500);
  }

  // Kitchen sound: only plays while player is watching cam 6 AND someone is there
  let kitchenTimer=0;
  function updateKitchenSound(dt){
    const chicaInKitchen=st.chica.room==='6';
    const freddyInKitchen=st.freddy.room==='6';
    const watchingKitchen=typeof Cameras!=='undefined'&&Cameras.isOpen()&&Cameras.getCurrentRoom()==='6';
    if((chicaInKitchen||freddyInKitchen)&&watchingKitchen){
      kitchenTimer+=dt;
      if(kitchenTimer>6000){
        kitchenTimer=0;
        Sound.play('kitchen_sound',.55);
      }
    } else {
      kitchenTimer=0;
    }
  }

  function update(dt){
    updateStandard('bonnie',BONNIE_PATH,dt,moveBonnie);
    updateStandard('chica',CHICA_PATH,dt,()=>moveCloser('chica',CHICA_PATH));
    updateFreddy(dt);
    updateFoxy(dt);
    updateKitchenSound(dt);
  }

  function applyNightHour(night,hour){
    // night=0 means custom night - never override custom difficulty
    if(night===0||!NIGHT_AI[night]) return;
    const schedule=NIGHT_AI[night];
    const keys=Object.keys(schedule).map(Number).sort((a,b)=>a-b);
    let cfg=schedule[0];
    for(const k of keys){ if(hour>=k) cfg=schedule[k]; }
    st.freddy.ai=cfg.f; st.bonnie.ai=cfg.b; st.chica.ai=cfg.c; foxy.ai=cfg.fx;
  }

  function onCameraView(room){
    ['freddy','bonnie','chica'].forEach(n=>{
      if(st[n].room===room) st[n].timer=0;
    });
  }
  function onCameraClose(){
    if(!foxy.running) foxy.timer=Math.min(foxy.timer,MO_INTERVAL*0.5);
  }
  function onPowerOut(){
    // Step 1: 2 second pause in darkness (lights already out)
    setTimeout(()=>{
      if(!Game.isRunning()) return;
      // Step 2: Freddy appears in office, laugh plays
      Office.showPoweroutFreddy(true);
      Sound.playFreddyLaugh();
      // Step 3: Music box plays immediately when Freddy appears
      Sound.startLoop('music_box','sounds/music_box.ogg',0.7);
      // Step 4: After exactly 20 seconds, if player hasn't won → jumpscare
      setTimeout(()=>{
        if(!Game.isRunning()) return; // player won at 6AM during this window
        Sound.stopLoop('music_box');
        Game.jumpscare('freddy');
      }, 20000);
    }, 2000);
  }
  function isAtDoor(name){
    if(name==='foxy') return foxy.running;
    return st[name]?.pathIdx===0;
  }
  function setNight(night){ applyNightHour(night,0); }
  function setDifficulty(f,b,c,fx){ st.freddy.ai=f;st.bonnie.ai=b;st.chica.ai=c;foxy.ai=fx; }
  function onHourChange(night,hour){ applyNightHour(night,hour); }
  function reset(){
    st.freddy={room:'1A',pathIdx:6,ai:st.freddy.ai,timer:0,atDoor:false};
    st.bonnie={room:'1A',pathIdx:6,ai:st.bonnie.ai,timer:0,atDoor:false};
    st.chica ={room:'1A',pathIdx:6,ai:st.chica.ai, timer:0,atDoor:false};
    foxy.stage=0;foxy.timer=0;foxy.running=false;foxy.hitCount=0;
    kitchenTimer=0;
  }
  function getStates(){
    return{
      freddy:{room:st.freddy.room},
      bonnie:{room:st.bonnie.room},
      chica:{room:st.chica.room},
      foxy:{room:'5',state:foxy.stage>=3?2:1,peekStage:foxy.stage,running:foxy.running},
    };
  }
  return{setNight,setDifficulty,update,reset,onCameraView,onCameraClose,onPowerOut,
         isAtDoor,getStates,getFoxyCameraImage,onHourChange};
})();
