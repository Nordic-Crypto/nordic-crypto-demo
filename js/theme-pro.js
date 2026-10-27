/* NC THEME PRO — theme switch (dark/light), shared with the landing page via localStorage 'nc_theme' */
(function(){
  'use strict';
  var KEY='nc_theme',root=document.documentElement;
  function get(){try{var v=localStorage.getItem(KEY);if(v==='light'||v==='dark')return v}catch(e){}return 'dark'}
  function apply(t){
    root.setAttribute('data-theme',t);
    var m=document.querySelector('meta[name=theme-color]');
    if(m)m.setAttribute('content',t==='dark'?'#07080c':'#f5f5ef');
    var ap=document.getElementById('adminPanel');if(ap)ap.setAttribute('data-theme',t);
    document.dispatchEvent(new CustomEvent('nc:theme',{detail:t}));
  }
  apply(get());
  var SUN='<svg class="i-sun" viewBox="0 0 24 24"><circle cx="12" cy="12" r="4"/><path d="M12 2v2m0 16v2M4.9 4.9l1.4 1.4m11.4 11.4l1.4 1.4M2 12h2m16 0h2M4.9 19.1l1.4-1.4m11.4-11.4l1.4-1.4"/></svg>';
  var MOON='<svg class="i-moon" viewBox="0 0 24 24"><path d="M21 12.8A9 9 0 1111.2 3a7 7 0 009.8 9.8z"/></svg>';
  function toggle(){
    var n=root.getAttribute('data-theme')==='dark'?'light':'dark';
    try{localStorage.setItem(KEY,n)}catch(e){}
    apply(n);
  }
  window.NCTheme={get:function(){return root.getAttribute('data-theme')},set:function(t){try{localStorage.setItem(KEY,t)}catch(e){}apply(t)},toggle:toggle};
  function ensure(){
    if(document.getElementById('ncThemeBtn'))return;
    var bar=document.querySelector('.main > .top');
    if(!bar)return;
    var anchor=bar.querySelector('.settings-btn')||bar.lastElementChild;
    var b=document.createElement('button');
    b.id='ncThemeBtn';b.className='top-icon';b.type='button';b.title='Theme';b.setAttribute('aria-label','Toggle theme');
    b.innerHTML=SUN+MOON;b.addEventListener('click',toggle);
    if(anchor&&anchor.parentNode)anchor.parentNode.insertBefore(b,anchor);else bar.appendChild(b);
  }
  /* the admin panel has its own toggle: route it through the shared theme */
  document.addEventListener('click',function(e){
    var b=e.target.closest&&e.target.closest('#themeToggleBtn');
    if(b){e.preventDefault();e.stopImmediatePropagation();toggle()}
  },true);
  ensure();setInterval(ensure,1500);
  window.addEventListener('storage',function(e){if(e.key===KEY)apply(get())});
})();

/* ---------- contrast guard ----------
   The legacy markup has many hard-coded colours (white headings, slate captions…).
   After a theme change this walks visible text and, where contrast is poor,
   sets a readable colour. It never touches physical-card art or coloured buttons. */
(function(){
  'use strict';
  var ATTR='data-ncfix';
  function parse(c){var m=c&&c.match(/[\d.]+/g);return m?m.map(Number):[0,0,0,1]}
  function lum(c){var m=parse(c);function f(v){v/=255;return v<=.03928?v/12.92:Math.pow((v+.055)/1.055,2.4)}return .2126*f(m[0])+.7152*f(m[1])+.0722*f(m[2])}
  function alpha(c){var m=parse(c);return m.length>3?m[3]:1}
  function effBg(e){
    while(e&&e!==document.documentElement){
      var cs=getComputedStyle(e),bg=cs.backgroundColor;
      if(alpha(bg)>.6)return bg;
      if(cs.backgroundImage&&cs.backgroundImage!=='none'){
        var ms=cs.backgroundImage.match(/rgba?\([^)]*\)/g);
        if(ms){for(var i=0;i<ms.length;i++){if(alpha(ms[i])>.5)return ms[i]}}
        else return null; /* url()/unknown art: leave alone */
      }
      e=e.parentElement;
    }
    return getComputedStyle(document.body).backgroundColor;
  }
  var SKIP='#verifyScreen,#verifyScreen *,#pendingScreen,#pendingScreen *,#rejectedScreen,#rejectedScreen *,#onboard,#onboard *,.login-screen,.login-screen *,.pay,.pay *,.big,.big *,.cc,.cc *,.mc,.mc *,canvas,svg,svg *,img,.btn.b1,.b1,.b1 *,.nc3-primary,.nc3-primary *,.ex-btn-deposit,.ex-btn-deposit *,.ex-btn-trade,.ex-btn-trade *,.av,.av *,[data-ncskip],[data-ncskip] *,.kp-cele,.kp-cele *,.cp-nocard-cta .btn,.ex-asset-icon-big,.ex-coin-icon,.nc3-asset-icon,.nc3-action-icon,.nc3-icon-circle,.nc3-stat-icon,.nc3-card-action-icon,.ex-asset-icon-big *,.ex-coin-icon *,.badge,.ex-live-badge,.ex-bal-badge,.settings-role,.admin-nav-badge,.mi.on,.mi.on *';
  function target(fg,bgL){
    var m=parse(fg),r=m[0],g=m[1],b=m[2];
    if(g>r+40&&g>b-20&&r<150)return 'var(--ok)';
    if(r>g+60&&r>b+40)return 'var(--bad)';
    var grey=Math.abs(r-b)<90&&Math.abs(r-g)<60;
    return grey&&m.length&&(Math.max(r,g,b)<235||bgL>.5)&&lum(fg)<.9?'var(--mut)':'var(--txt)';
  }
  function reset(){
    [].forEach.call(document.querySelectorAll('['+ATTR+']'),function(e){
      var o=e.getAttribute(ATTR);e.removeAttribute(ATTR);
      if(o&&o!=='-')e.style.setProperty('color',o);else e.style.removeProperty('color');
    });
  }
  var busy=false;
  function run(){
    if(busy)return;busy=true;
    try{
      var root=document.querySelector('.main')||document.body;
      var scopes=[root].concat([].slice.call(document.querySelectorAll('.mask.on,.admin-panel')));
      var seen=new Set();
      scopes.forEach(function(sc){
        [].forEach.call(sc.querySelectorAll('*'),function(e){
          if(seen.has(e))return;seen.add(e);
          if(e.hasAttribute(ATTR))return;
          if(!e.offsetParent&&getComputedStyle(e).position!=='fixed')return;
          var hasText=false;for(var n=e.firstChild;n;n=n.nextSibling){if(n.nodeType===3&&n.nodeValue.trim().length>1){hasText=true;break}}
          if(!hasText)return;
          if(e.matches(SKIP))return;
          var cs=getComputedStyle(e);if(+cs.opacity<.3)return;
          var bg=effBg(e);if(!bg)return;
          var l1=lum(cs.color),l2=lum(bg),cr=(Math.max(l1,l2)+.05)/(Math.min(l1,l2)+.05);
          if(cr>=3.2)return;
          var t=bg&&l2<.25?'#f4f5f8':target(cs.color,l2);
          if(l2<.25&&l1<.25)t='#e6e9f2';
          if(l2<.25&&t!=='#f4f5f8'&&t!=='#e6e9f2')t=t==='var(--mut)'?'#98a0b3':'#f4f5f8';
          e.setAttribute(ATTR,e.style.color||'-');
          e.style.setProperty('color',t,'important');
        });
      });
    }catch(err){}
    busy=false;
  }
  var timer=0;
  function later(ms){clearTimeout(timer);timer=setTimeout(run,ms||350)}
  document.addEventListener('nc:theme',function(){reset();later(60);later(600)});
  var mo=new MutationObserver(function(m){
    for(var i=0;i<m.length;i++){var t=m[i].target;if(t.nodeType===1&&t.hasAttribute&&t.hasAttribute(ATTR))continue;later(500);return}
  });
  function start(){mo.observe(document.body,{childList:true,subtree:true,characterData:true});later(300)}
  if(document.body)start();else document.addEventListener('DOMContentLoaded',start);
  setInterval(run,4000);
})();
