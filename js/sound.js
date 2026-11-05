const Sound = (() => {
  const SOUNDS = {
    'blip':          'sounds/blip.mp3',
    'cam_toggle':    'sounds/camera_down.mp3',  // same sound for open AND close
    'door':          'sounds/door.mp3',
    'knock':         'sounds/knock.mp3',
    'door_bang':     'sounds/door_bang.mp3',
    'light_hit':     'sounds/breathing.mp3',    // plays when animatronic seen at door
    'steps':         'sounds/steps.mp3',
    'scream':        'sounds/scream.mp3',
    'scream2':       'sounds/scream2.mp3',      // death screen only
    'powerdown':     'sounds/powerdown.mp3',
    'chimes':        'sounds/chimes.mp3',       // 6AM
    'freddy_laugh1': 'sounds/freddy_laugh1.mp3',
    'freddy_laugh2': 'sounds/freddy_laugh2.mp3',
    'freddy_laugh3': 'sounds/freddy_laugh3.mp3',
    'golden_freddy': 'sounds/golden_freddy.ogg',
    'glitch':        'sounds/glitch.mp3',       // menu UI + cam switch
    'kitchen_sound': 'sounds/kitchen_sound.mp3', // Chica in kitchen (pots/pans)
    'music_box':     'sounds/music_box.ogg',      // Freddy power-out theme
    'title_music':   'sounds/title_music.mp3',
    'call_1':        'sounds/call_1.mp3',
    'call_2':        'sounds/call_2.mp3',
    'call_3':        'sounds/call_3.mp3',
    'call_4':        'sounds/call_4.mp3',
    'call_5':        'sounds/call_5.mp3',
  };
  const cache={};
  const loops={};
  let callAudio=null; // current phone call audio

  function preload(){
    for(const[name,path] of Object.entries(SOUNDS)){
      // Don't preload large WAVs into memory - load on demand
      if(name.startsWith('call_')||name==='title_music') continue;
      const a=new Audio(); a.src=path; a.preload='auto'; cache[name]=a;
    }
  }

  function play(name,vol=0.5){
    const a=cache[name];
    if(!a){
      // On-demand load for large files
      const path=SOUNDS[name]; if(!path) return null;
      const b=new Audio(path); b.volume=Math.max(0,Math.min(1,vol));
      b.play().catch(()=>{}); return b;
    }
    const clone=a.cloneNode();
    clone.volume=Math.max(0,Math.min(1,vol));
    clone.play().catch(()=>{});
    return clone;
  }

  // Random Freddy laugh
  function playFreddyLaugh(){
    const n=Math.floor(Math.random()*3)+1;
    play('freddy_laugh'+n,.5);
  }

  // Steps sound: play only ~30% of the time (you "get lucky" to hear it)
  function maybeSteps(){
    if(Math.random()<0.3) play('steps',.4);
  }

  function stop(name){ const a=cache[name]; if(a){a.pause();a.currentTime=0;} }

  function stopAll(){
    for(const a of Object.values(cache)){a.pause();a.currentTime=0;}
    stopCall();
  }

  function startLoop(name,path,vol=0.3){
    if(loops[name]) return;
    const a=new Audio(path); a.loop=true; a.volume=vol;
    a.play().catch(()=>{}); loops[name]=a;
  }

  function stopLoop(name){
    if(!loops[name]) return;
    loops[name].pause(); loops[name].currentTime=0; delete loops[name];
  }

  function stopAllLoops(){
    for(const name of Object.keys(loops)) stopLoop(name);
  }

  // Phone call management
  function playCall(night){
    stopCall();
    const key='call_'+night;
    const path=SOUNDS[key]; if(!path) return;
    callAudio=new Audio(path);
    callAudio.volume=0.55;
    callAudio.play().catch(()=>{});
  }
  function stopCall(){
    if(callAudio){ callAudio.pause(); callAudio.currentTime=0; callAudio=null; }
  }
  function pauseCall(){
    if(callAudio&&!callAudio.paused) callAudio.pause();
  }
  function resumeCall(){
    if(callAudio&&callAudio.paused) callAudio.play().catch(()=>{});
  }
  function muteCall(){
    if(callAudio) callAudio.volume=callAudio.volume>0?0:0.55;
    return callAudio&&callAudio.volume===0;
  }
  function isCallMuted(){ return callAudio&&callAudio.volume===0; }

  // Title music: needs user gesture to play (browser autoplay policy)
  let titleMusicPending = false;
  function startTitleMusic(){
    if(loops['title']) return;
    const a=new Audio('sounds/title_music.mp3');
    a.loop=true; a.volume=0.4;
    const p=a.play();
    loops['title']=a;
    if(p && p.catch){
      p.catch(()=>{
        // Autoplay blocked - start on first user interaction
        titleMusicPending=true;
        const resume=()=>{
          if(titleMusicPending&&loops['title']){
            loops['title'].play().catch(()=>{});
            titleMusicPending=false;
          }
          document.removeEventListener('click',resume);
          document.removeEventListener('keydown',resume);
          document.removeEventListener('mousemove',resume);
        };
        document.addEventListener('click',resume,{once:true});
        document.addEventListener('keydown',resume,{once:true});
        document.addEventListener('mousemove',resume,{once:true});
      });
    }
  }
  function stopTitleMusic(){ titleMusicPending=false; stopLoop('title'); }

  return{preload,play,playFreddyLaugh,maybeSteps,stop,stopAll,pauseCall,resumeCall,
         startLoop,stopLoop,stopAllLoops,
         playCall,stopCall,muteCall,isCallMuted,
         startTitleMusic,stopTitleMusic};
})();
