const Cameras = (() => {
  const camLayer  = document.getElementById('camera-layer');
  const camFeed   = document.getElementById('cam-feed');
  const camRoomNm = document.getElementById('cam-room-name');
  const offLayer  = document.getElementById('office-layer');
  const btnsDom   = document.querySelectorAll('.cmb');
  const handle    = document.getElementById('cam-handle');

  const ROOMS = {
    '1A':{name:'Show Stage',    base:'graphics/cameras/1a.webp',f:'graphics/cameras/1a_f.webp',bf:'graphics/cameras/1a_bf.webp',cf:'graphics/cameras/1a_cf.webp',all:'graphics/cameras/1a_all.webp'},
    '1B':{name:'Dining Area',   base:'graphics/cameras/1b.webp',b:'graphics/cameras/1b_b.webp',c:'graphics/cameras/1b_c.webp',f:'graphics/cameras/1b_f.webp',all:'graphics/cameras/1b_all.webp'},
    '1C':{name:'Backstage',     base:'graphics/cameras/1c.webp',b:'graphics/cameras/1c_b.webp'},
    '2A':{name:'W. Hall',       base:'graphics/cameras/2b.webp',b:'graphics/cameras/2b_b.webp'},
    '2B':{name:'W. Hall Corner',base:'graphics/cameras/3.webp', b:'graphics/cameras/3_b.webp'},
    '3': {name:'Supply Closet', base:'graphics/cameras/5.webp', b:'graphics/cameras/5_b.webp'},
    '4A':{name:'E. Hall',       base:'graphics/cameras/4a.webp',c:'graphics/cameras/4a_c.webp',cf:'graphics/cameras/4a_cf.webp'},
    '4B':{name:'E. Hall Corner',base:'graphics/cameras/4b.webp',c:'graphics/cameras/4b_c.webp',f:'graphics/cameras/4b_f.webp'},
    '5': {name:"Pirate's Cove", base:'graphics/cameras/2a.webp'},
    // CAM 6 = Kitchen: AUDIO ONLY (no video feed in real game)
    '6': {name:'Kitchen',       audioOnly:true},
    // CAM 7 = Restrooms: has Chica and Freddy variants
    '7': {name:'Restrooms',     base:'graphics/cameras/7.webp', c:'graphics/cameras/7_c.webp',f:'graphics/cameras/7_f.webp'},
  };
  const AUTO_PAN_ROOMS = new Set(['1A','1B','1C','2A','4A','4B','7']);
  let autoPanX=0.5, autoPanDir=1;
  const AUTO_PAN_SPD=0.00008;

  let open=false, cur='1A', transitioning=false;
  let lastToggle=0;
  const TOGGLE_COOLDOWN=700; // ms between toggles

  function getImg(room){
    if(room==='5') return AI.getFoxyCameraImage();
    const r=ROOMS[room]; if(!r) return '';
    // Audio-only rooms: Kitchen (cam 6)
    if(r.audioOnly) return null;
    const s=AI.getStates();
    const b=s.bonnie.room===room,c=s.chica.room===room,f=s.freddy.room===room;
    if(b&&c&&f&&r.all) return r.all;
    if(b&&f&&r.bf) return r.bf; if(c&&f&&r.cf) return r.cf;
    if(c&&r.c) return r.c; if(b&&r.b) return r.b; if(f&&r.f) return r.f;
    return r.base;
  }

  // Audio-only room overlay
  const audioOnlyEl = (() => {
    const d=document.createElement('div');
    d.id='cam-audio-only';
    d.innerHTML='<div>-CAMERA DISABLED-</div><div>AUDIO ONLY</div>';
    // Important: start hidden, only show when on Kitchen cam
    d.style.position='absolute';
    d.style.inset='0';
    d.style.background='#000';
    d.style.zIndex='8'; /* below map (z:10) so map stays visible */
    d.style.flexDirection='column';
    d.style.alignItems='center';
    d.style.justifyContent='center';
    d.style.gap='8px';
    d.style.fontSize='clamp(.6rem,1.3vw,1rem)';
    d.style.color='#fff';
    d.style.letterSpacing='.08em';
    d.style.pointerEvents='none';
    d.style.display='none'; // HIDDEN by default
    document.getElementById('camera-layer')?.appendChild(d);
    return d;
  })();

  function refreshFeed(){
    const r=ROOMS[cur];
    if(r?.audioOnly){
      camFeed.style.display='none';
      if(audioOnlyEl) audioOnlyEl.style.display='flex';
      return;
    }
    if(audioOnlyEl) audioOnlyEl.style.display='none';
    camFeed.style.display='block';
    const newSrc=getImg(cur);
    if(!newSrc) return;
    // Flash static when the image changes (animatronic moved in/out of view)
    if(open && camFeed.src && !camFeed.src.endsWith(newSrc)){
      const gif=document.getElementById('cam-static-gif');
      const noise=document.getElementById('cam-noise-layer');
      if(gif){ gif.style.opacity='0.7'; gif.style.mixBlendMode='normal'; }
      if(noise){ noise.style.opacity='0.8'; }
      camFeed.src=newSrc;
      setTimeout(()=>{
        if(gif){ gif.style.opacity='0.18'; gif.style.mixBlendMode='screen'; }
        if(noise){ noise.style.opacity='0.18'; }
      },120);
    } else {
      camFeed.src=newSrc;
    }
  }

  // Fast static glitch — no DOM creation, just CSS class toggle
  // Uses the existing #cam-static-gif and a CSS class to flash it
  function doGlitch(cb){
    transitioning=true;
    const sg=document.getElementById('screen-game');
    sg.classList.add('cam-glitch-flash');
    Sound.play('glitch',.35);
    setTimeout(()=>{
      sg.classList.remove('cam-glitch-flash');
      transitioning=false;
      if(cb) cb();
    }, 150);
  }

  // Room switch glitch (faster, no sound overlap)
  function flashSwitch(){
    // Full static flash before switching rooms
    Sound.play('blip',.35);
    Sound.play('glitch',.22);
    // Blast the scanline overlay bright for a moment
    const cl = document.getElementById('camera-layer');
    if(cl) cl.classList.add('cam-switch-flash');
    camFeed.style.opacity='0';
    setTimeout(()=>{
      camFeed.style.opacity='1';
      if(cl) cl.classList.remove('cam-switch-flash');
    },120);
  }

  function doOpen(){
    open=true;
    camLayer.classList.remove('hidden');
    offLayer.style.visibility='hidden';
    Power.setUsage('camera',true);
    autoPanX=0.5; autoPanDir=1;
    camRoomNm.textContent=ROOMS[cur]?.name||cur;
    btnsDom.forEach(b=>b.classList.toggle('sel',b.dataset.room===cur));
    refreshFeed();
    AI.onCameraView(cur);
    if(handle) handle.classList.add('cam-open');
  }

  function doClose(){
    open=false;
    camLayer.classList.add('hidden');
    offLayer.style.visibility='visible';
    Power.setUsage('camera',false);
    AI.onCameraClose(cur);
    camFeed.style.transform='translateX(0%)';
    camFeed.style.display='block';
    const aoe=document.getElementById('cam-audio-only');
    if(aoe) aoe.style.display='none';
    if(handle) handle.classList.remove('cam-open');
  }

  function setOpen(val){
    if(open===val||transitioning) return;
    if(val && !Power.isPowered()) return;
    // Block if game is paused
    if(typeof Game!=='undefined' && Game.isPaused && Game.isPaused()) return;
    const now=Date.now();
    if(now-lastToggle<TOGGLE_COOLDOWN) return;
    lastToggle=now;

    // Just glitch and switch — no slow webp animation
    doGlitch(()=>{
      if(val) doOpen(); else doClose();
    });
  }

  function forceClose(){
    open=false; transitioning=false;
    if(handle) handle.classList.remove('cam-open');
    camLayer.classList.add('hidden');
    offLayer.style.visibility='visible';
    Power.setUsage('camera',false);
    camFeed.style.transform='translateX(0%)';
  }

  function switchRoom(room){
    if(room===cur&&open) return;
    cur=room;
    camRoomNm.textContent=ROOMS[room]?.name||room;
    btnsDom.forEach(b=>b.classList.toggle('sel',b.dataset.room===room));
    autoPanX=0.5; autoPanDir=1;
    camFeed.style.transform='translateX(0%)';
    flashSwitch();
    refreshFeed();
    AI.onCameraView(room);
  }

  function update(dt){
    if(!open||transitioning) return;
    if(AUTO_PAN_ROOMS.has(cur)){
      autoPanX+=autoPanDir*AUTO_PAN_SPD*dt;
      if(autoPanX>=1){autoPanX=1;autoPanDir=-1;}
      if(autoPanX<=0){autoPanX=0;autoPanDir=1;}
      camFeed.style.transform=`translateX(${-(autoPanX*28.5)}%)`;
    }
  }

  function reset(){
    open=false; cur='1A'; transitioning=false; lastToggle=0;
    autoPanX=0.5; autoPanDir=1;
    if(handle) handle.classList.remove('cam-open');
    camLayer.classList.add('hidden');
    offLayer.style.visibility='visible';
    camFeed.style.transform='translateX(0%)';
    camFeed.style.opacity='1';
    camRoomNm.textContent='Show Stage';
    btnsDom.forEach(b=>b.classList.toggle('sel',b.dataset.room==='1A'));
    Power.setUsage('camera',false);
  }

  function bindEvents(){
    document.addEventListener('mousemove',e=>{
      // Never trigger during pause or non-game screens
      if(typeof Game!=='undefined'){
        if(!Game.isRunning()) return;
        if(Game.isPaused && Game.isPaused()) return;
      }
      const sg=document.getElementById('screen-game');
      if(!sg||!sg.classList.contains('active')) return;
      const rect=sg.getBoundingClientRect();
      const relY=(e.clientY-rect.top)/rect.height;
      const relX=(e.clientX-rect.left)/rect.width;
      if(!open && relY>0.93 && relX>0.25 && relX<0.75) setOpen(true);
      else if(open && relY>0.93 && relX>0.25 && relX<0.75) setOpen(false);
    });

    btnsDom.forEach(btn=>btn.addEventListener('click',e=>{
      e.stopPropagation();
      if(open&&!transitioning) switchRoom(btn.dataset.room);
    }));
  }

  function init(){ bindEvents(); reset(); }
  return{init,reset,update,refreshFeed,forceClose,isOpen:()=>open,getCurrentRoom:()=>cur};
})();
