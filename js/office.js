const Office = (() => {
  const officeWrap = document.getElementById('office-wrap');
  const officeBg   = document.getElementById('office-bg');
  const foxyEl     = document.getElementById('foxy-rush');
  const fredEl     = document.getElementById('powerout-fred');

  // Office image is 1601px wide. When viewport is wider, scale it up
  // so there is always room to pan left/right.
  const IMG_W = 1601;
  let panX = 0;
  let panDir = 0;
  const PAN_SPD = 3.8; // px per millisecond (frame-rate independent)

  // Scale: always make rendered image at least 1.4× the viewport width
  // so there is always pan room. On narrow windows, no scaling needed.
  function getScale(){
    const vw = window.innerWidth;
    const needed = vw * 1.4; // rendered width must be at least 1.4× viewport
    return needed > IMG_W ? needed / IMG_W : 1;
  }
  function getRenderedW(){ return IMG_W * getScale(); }
  function getViewW(){ return window.innerWidth; }
  function getMinPan(){ return -(getRenderedW() - getViewW()); }
  function getCenterPan(){ return getMinPan() / 2; }

  function applyScale(){
    const s = getScale();
    officeWrap.style.transformOrigin = '0 0';
    // Apply scale separately from pan using CSS var or combine in transform
    // We'll track panX and apply both pan + scale together
    officeWrap.style.transform = `translateX(${panX}px) scaleX(${s})`;
  }

  const st={doorL:false,doorR:false,lightL:false,lightR:false,
            bonAtDoor:false,chiAtDoor:false,powered:true};

  const IMGS={
    def:'graphics/office/office.webp',
    ll:'graphics/office/light_left.webp',rl:'graphics/office/light_right.webp',
    lrl:'graphics/office/lights_both.webp',
    ld:'graphics/office/door_left_closed.webp',rd:'graphics/office/door_right_closed.webp',
    ldrd:'graphics/office/doors_both_closed.webp',
    ll_bon:'graphics/office/light_left_bonnie.webp',
    rl_chi:'graphics/office/light_right_chica.webp',
    lrl_bon:'graphics/office/lights_both_bonnie.webp',
    lrl_chi:'graphics/office/lights_both_chica.webp',
    lrl_bon_chi:'graphics/office/lights_both_bonnie_chica.webp',
    rd_ll:'graphics/office/door_right_light_left.webp',
    ld_rl:'graphics/office/door_left_light_right.webp',
    rd_ll_bon:'graphics/office/door_right_light_left_bonnie.webp',
    ld_rl_chi:'graphics/office/door_left_light_right_chica.webp',
    po:'graphics/office/powerout0.webp',
  };

  function getImg(){
    if(!st.powered)return IMGS.po;
    const{doorL:ld,doorR:rd,lightL:ll,lightR:rl,bonAtDoor:bon,chiAtDoor:chi}=st;
    const b=bon&&ll,c=chi&&rl;
    if(ld&&rd)return IMGS.ldrd;
    if(rd&&ll&&b)return IMGS.rd_ll_bon;if(rd&&ll)return IMGS.rd_ll;
    if(ld&&rl&&c)return IMGS.ld_rl_chi;if(ld&&rl)return IMGS.ld_rl;
    if(rd)return IMGS.rd;if(ld)return IMGS.ld;
    if(ll&&rl&&b&&c)return IMGS.lrl_bon_chi;
    if(ll&&rl&&b)return IMGS.lrl_bon;if(ll&&rl&&c)return IMGS.lrl_chi;
    if(ll&&rl)return IMGS.lrl;
    if(ll&&b)return IMGS.ll_bon;if(rl&&c)return IMGS.rl_chi;
    if(ll)return IMGS.ll;if(rl)return IMGS.rl;
    return IMGS.def;
  }
  function refresh(){officeBg.src=getImg();}

  function toggleDoor(side){
    if(!st.powered)return;
    Sound.play('door',.5);
    if(side==='left'){st.doorL=!st.doorL;Power.setUsage('door-left',st.doorL);}
    else             {st.doorR=!st.doorR;Power.setUsage('door-right',st.doorR);}
    refresh();
  }
  function lightOn(side){
    if(!st.powered)return;
    if(side==='left'&&!st.lightR){
      st.lightL=true;Power.setUsage('light-left',true);
      st.bonAtDoor=AI.isAtDoor('bonnie');if(st.bonAtDoor)Sound.play('light_hit',.7);
    }else if(side==='right'&&!st.lightL){
      st.lightR=true;Power.setUsage('light-right',true);
      st.chiAtDoor=AI.isAtDoor('chica');if(st.chiAtDoor)Sound.play('light_hit',.7);
    }else{Sound.play('blip',.3);return;}
    refresh();
  }
  function lightOff(side){
    if(side==='left'){st.lightL=false;st.bonAtDoor=false;Power.setUsage('light-left',false);}
    else             {st.lightR=false;st.chiAtDoor=false;Power.setUsage('light-right',false);}
    refresh();
  }

  function showAtDoor(name,show){
    if(name==='foxy'){
      foxyEl.src=show?'graphics/office/foxy_hallway.webp':'';
      foxyEl.classList.toggle('hidden',!show);
    }
  }
  function showPoweroutFreddy(show){
    fredEl.src=show?'graphics/office/freddy_powerout.webp':'';
    fredEl.classList.toggle('hidden',!show);
  }
  function setPowered(on){
    st.powered=on;
    if(!on){
      st.lightL=st.lightR=st.bonAtDoor=st.chiAtDoor=false;
      Power.setUsage('light-left',false);Power.setUsage('light-right',false);
    }
    refresh();
  }

  // Pan: mouse near left edge pans left (reveals left hall), right edge pans right
  function update(dt){
    if(panDir===0||Cameras.isOpen())return;
    panX+=panDir*PAN_SPD*dt;
    const minPan=getMinPan();
    panX=Math.max(minPan,Math.min(0,panX));
    applyScale();
  }

  function reset(){
    Object.assign(st,{doorL:false,doorR:false,lightL:false,lightR:false,
                      bonAtDoor:false,chiAtDoor:false,powered:true});
    // Start centered
    panX=getCenterPan();
    panDir=0;
    applyScale();
    foxyEl.classList.add('hidden');
    fredEl.classList.add('hidden');
    refresh();
  }

  function bindEvents(){
    // Click zones over the baked-in buttons in the office image
    // These are positioned as % of the office image width in the CSS
    document.getElementById('click-door-left').addEventListener('click',()=>toggleDoor('left'));
    document.getElementById('click-light-left').addEventListener('mousedown',()=>lightOn('left'));
    document.getElementById('click-light-left').addEventListener('mouseup',()=>lightOff('left'));
    document.getElementById('click-light-left').addEventListener('mouseleave',()=>lightOff('left'));
    document.getElementById('click-door-right').addEventListener('click',()=>toggleDoor('right'));
    document.getElementById('click-light-right').addEventListener('mousedown',()=>lightOn('right'));
    document.getElementById('click-light-right').addEventListener('mouseup',()=>lightOff('right'));
    document.getElementById('click-light-right').addEventListener('mouseleave',()=>lightOff('right'));

    // Mouse pan: left 12% pans left hall, right 12% pans right hall
    const sg=document.getElementById('screen-game');
    sg.addEventListener('mousemove',e=>{
      if(Cameras.isOpen()){panDir=0;return;}
      const rect=sg.getBoundingClientRect();
      const r=(e.clientX-rect.left)/rect.width;
      if(r<0.12)       panDir=1;   // mouse on left → reveal left hall
      else if(r>0.88)  panDir=-1;  // mouse on right → reveal right hall
      else             panDir=0;
    });
    sg.addEventListener('mouseleave',()=>panDir=0);
  }

  function init(){
    panX=getCenterPan();
    applyScale();
    bindEvents();
    reset();
  }
  return{init,reset,update,setPowered,showAtDoor,showPoweroutFreddy,getState:()=>st};
})();
