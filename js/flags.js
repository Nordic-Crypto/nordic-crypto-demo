/* flags.js — Windows has no flag emoji (shows "DK", "GB" letters). Replace them with inline SVG flags. */
(function(){
  var W='<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 16" preserveAspectRatio="none">';
  var F={
    GB:W+'<rect width="24" height="16" fill="#012169"/><path d="M0 0l24 16M24 0L0 16" stroke="#fff" stroke-width="3.2"/><path d="M0 0l24 16M24 0L0 16" stroke="#C8102E" stroke-width="1.2"/><path d="M12 0v16M0 8h24" stroke="#fff" stroke-width="5.2"/><path d="M12 0v16M0 8h24" stroke="#C8102E" stroke-width="3"/></svg>',
    DK:W+'<rect width="24" height="16" fill="#C8102E"/><path d="M9 0v16M0 8h24" stroke="#fff" stroke-width="2.8"/></svg>',
    FI:W+'<rect width="24" height="16" fill="#fff"/><path d="M8.5 0v16M0 8h24" stroke="#003580" stroke-width="3.2"/></svg>',
    ES:W+'<rect width="24" height="16" fill="#AA151B"/><rect y="4" width="24" height="8" fill="#F1BF00"/></svg>',
    NO:W+'<rect width="24" height="16" fill="#BA0C2F"/><path d="M8.5 0v16M0 8h24" stroke="#fff" stroke-width="4.4"/><path d="M8.5 0v16M0 8h24" stroke="#00205B" stroke-width="2.2"/></svg>',
    SE:W+'<rect width="24" height="16" fill="#006AA7"/><path d="M8.5 0v16M0 8h24" stroke="#FECC02" stroke-width="3.2"/></svg>',
    FR:W+'<rect width="8" height="16" fill="#0055A4"/><rect x="8" width="8" height="16" fill="#fff"/><rect x="16" width="8" height="16" fill="#EF4135"/></svg>',
    DE:W+'<rect width="24" height="5.34" fill="#000"/><rect y="5.33" width="24" height="5.34" fill="#DD0000"/><rect y="10.66" width="24" height="5.34" fill="#FFCE00"/></svg>',
    AU:W+'<rect width="24" height="16" fill="#00247D"/><path d="M0 0l12 8M12 0L0 8" stroke="#fff" stroke-width="1.4"/><path d="M0 0l12 8M12 0L0 8" stroke="#CF142B" stroke-width=".6"/><path d="M6 0v8M0 4h12" stroke="#fff" stroke-width="2.6"/><path d="M6 0v8M0 4h12" stroke="#CF142B" stroke-width="1.3"/><circle cx="6" cy="12.4" r="1.5" fill="#fff"/><circle cx="18.5" cy="3.4" r=".9" fill="#fff"/><circle cx="20.6" cy="8" r=".9" fill="#fff"/><circle cx="18.5" cy="12.6" r=".9" fill="#fff"/><circle cx="16" cy="8" r=".8" fill="#fff"/><circle cx="19" cy="7" r=".45" fill="#fff"/></svg>',
    CA:W+'<rect width="24" height="16" fill="#fff"/><rect width="6" height="16" fill="#D52B1E"/><rect x="18" width="6" height="16" fill="#D52B1E"/><path d="M12 3l.55 1.9 1.6-1-.55 2 .95.15-.8 1.35 2 .55-2 .7.35 1.25-1.75-.35.05 2.1h-.7l.05-2.1-1.75.35.35-1.25-2-.7 2-.55-.8-1.35.95-.15-.55-2 1.6 1z" fill="#D52B1E"/></svg>',
    IT:W+'<rect width="8" height="16" fill="#009246"/><rect x="8" width="8" height="16" fill="#fff"/><rect x="16" width="8" height="16" fill="#CE2B37"/></svg>',
    US:W+'<rect width="24" height="16" fill="#B22234"/><rect y="1.23" width="24" height="1.23" fill="#fff"/><rect y="3.69" width="24" height="1.23" fill="#fff"/><rect y="6.15" width="24" height="1.23" fill="#fff"/><rect y="8.62" width="24" height="1.23" fill="#fff"/><rect y="11.08" width="24" height="1.23" fill="#fff"/><rect y="13.54" width="24" height="1.23" fill="#fff"/><rect width="10" height="8.62" fill="#3C3B6E"/></svg>',
    NL:W+'<rect width="24" height="16" fill="#21468B"/><rect width="24" height="10.67" fill="#fff"/><rect width="24" height="5.33" fill="#AE1C28"/></svg>',
    IE:W+'<rect width="8" height="16" fill="#169B62"/><rect x="8" width="8" height="16" fill="#fff"/><rect x="16" width="8" height="16" fill="#FF883E"/></svg>',
    PL:W+'<rect width="24" height="8" fill="#fff"/><rect y="8" width="24" height="8" fill="#DC143C"/></svg>'
  };
  /* programmatic API so the admin table and welcome cards can draw a real flag from an ISO-2 code */
  window.NCFlags = {
    has: function (cc) { return !!F[String(cc || '').toUpperCase()]; },
    uri: function (cc) { cc = String(cc || '').toUpperCase(); return F[cc] ? 'data:image/svg+xml;utf8,' + encodeURIComponent(F[cc]) : ''; },
    html: function (cc, cls) { cc = String(cc || '').toUpperCase(); if (!F[cc]) return ''; return '<span class="ncflag ' + (cls || '') + '" role="img" aria-label="' + cc + '" style="background-image:url(\'' + this.uri(cc) + '\')"></span>'; }
  };
  var CSS='.ncflag{display:inline-block;width:1.3em;height:.95em;vertical-align:-.12em;border-radius:2px;background-size:100% 100%;background-repeat:no-repeat;box-shadow:0 0 0 1px rgba(128,128,128,.35);font-size:inherit}';
  var st=document.createElement('style');st.textContent=CSS;document.head.appendChild(st);
  var RE=/[\uD83C][\uDDE6-\uDDFF][\uD83C][\uDDE6-\uDDFF]/g;
  function code(s){return String.fromCharCode(s.charCodeAt(1)-0xDDE6+65)+String.fromCharCode(s.charCodeAt(3)-0xDDE6+65)}
  function span(c){var e=document.createElement('span');e.className='ncflag';e.setAttribute('role','img');e.setAttribute('aria-label',c);
    e.style.backgroundImage='url("data:image/svg+xml;utf8,'+encodeURIComponent(F[c])+'")';return e}
  function walk(root){
    var w=document.createTreeWalker(root,NodeFilter.SHOW_TEXT,null),n,list=[];
    while((n=w.nextNode())){
      if(!n.nodeValue||n.nodeValue.indexOf('\uD83C')<0)continue;
      var p=n.parentNode;if(!p||/^(SCRIPT|STYLE|TEXTAREA|OPTION|TITLE)$/.test(p.nodeName))continue;
      RE.lastIndex=0;if(RE.test(n.nodeValue))list.push(n);
    }
    list.forEach(function(t){
      var s=t.nodeValue,f=document.createDocumentFragment(),last=0,m;RE.lastIndex=0;
      while((m=RE.exec(s))){
        var c=code(m[0]);if(!F[c])continue;
        if(m.index>last)f.appendChild(document.createTextNode(s.slice(last,m.index)));
        f.appendChild(span(c));last=m.index+4;
      }
      if(last===0)return;
      if(last<s.length)f.appendChild(document.createTextNode(s.slice(last)));
      t.parentNode.replaceChild(f,t);
    });
  }
  var busy=false;
  function run(){if(busy)return;busy=true;try{walk(document.body)}finally{busy=false}}
  function start(){run();var tm=0;new MutationObserver(function(){if(tm)return;tm=setTimeout(function(){tm=0;run()},120)}).observe(document.body,{childList:true,subtree:true,characterData:true})}
  if(document.body)start();else document.addEventListener('DOMContentLoaded',start);
})();
