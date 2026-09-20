/* Sortir du squat — le bâtiment vivant.
   50 fenêtres (une par future habitante ou futur habitant inscrit), 120 briques (une par promesse de prêt).
   Données réelles : RPC compteur() et facade(). Chaque place se clique : nom et photo n'apparaissent que si la personne l'a accepté.
   Tout ce qui bouge est coupé quand la réduction de mouvement est demandée. */
(function(){
  var SB='https://gjvxwijhowbyhfwlybvt.supabase.co';
  var SBK='sb_publishable_MApC_iB8eu_2nHWhnE3iaA_PzRLqS2y';
  var NS='http://www.w3.org/2000/svg';
  var reduit=window.matchMedia&&matchMedia('(prefers-reduced-motion: reduce)').matches;

  function el(n,a,parent){var e=document.createElementNS(NS,n);for(var k in a)e.setAttribute(k,a[k]);if(parent)parent.appendChild(e);return e}
  function hel(n,cls,txt){var e=document.createElement(n);if(cls)e.className=cls;if(txt!=null)e.textContent=txt;return e}
  function fmt(v){return Math.max(0,v|0).toLocaleString('fr-BE')}
  // Joue fn une seule fois quand la cible entre dans l'écran, ou si elle a déjà été dépassée (arrivée par une ancre plus bas).
  function observer(cible,fn,seuil){
    if(!('IntersectionObserver' in window)){fn();return}
    var fait=false, io;
    function go(){ if(fait)return; fait=true; io.disconnect(); removeEventListener('scroll',verif); fn(); }
    function verif(){ if(cible.getBoundingClientRect().bottom<0) go(); }
    io=new IntersectionObserver(function(es){ if(es[0].isIntersecting) go(); },{threshold:seuil||.3});
    io.observe(cible); addEventListener('scroll',verif,{passive:true}); setTimeout(verif,400);
  }
  function photoUrl(nom){ return nom?SB+'/storage/v1/object/public/portraits/'+nom:null; }

  /* ---------- Données ---------- */
  function rpc(nom){
    return fetch(SB+'/rest/v1/rpc/'+nom,{method:'POST',headers:{apikey:SBK,'Content-Type':'application/json'},body:'{}'})
      .then(function(r){if(!r.ok)throw 0;return r.json()});
  }
  // → {habitants, preteurs, brut, noms:{habitant:{n:{nom,photo}}, preteur:{n:{nom,photo}}}}
  function charger(){
    return Promise.all([rpc('compteur'),rpc('facade').catch(function(){return []})]).then(function(r){
      var c=r[0]||{}, noms={habitant:{},preteur:{}};
      (r[1]||[]).forEach(function(g){ if(noms[g.type]) noms[g.type][g.i]={nom:g.nom||'',photo:g.photo||''}; });
      return {habitants:Math.min(50,c.habitants||0), preteurs:Math.min(120,c.preteurs||0), brut:c, noms:noms};
    });
  }
  function inscrire(donnees){
    return fetch(SB+'/rest/v1/inscriptions',{method:'POST',headers:{apikey:SBK,'Content-Type':'application/json',Prefer:'return=minimal'},body:JSON.stringify(donnees)})
      .then(function(r){if(!r.ok)throw 0;});
  }
  // Réduit la photo à un carré de 320 px (JPEG), ce qui retire aussi les métadonnées, puis l'envoie. → nom de fichier, ou null si ça échoue.
  function reduire(fichier){
    return new Promise(function(ok,ko){
      var url=URL.createObjectURL(fichier), img=new Image();
      img.onload=function(){
        try{
          var T=320, c=document.createElement('canvas'); c.width=T; c.height=T;
          var s=Math.min(img.naturalWidth,img.naturalHeight), sx=(img.naturalWidth-s)/2, sy=(img.naturalHeight-s)/2;
          c.getContext('2d').drawImage(img,sx,sy,s,s,0,0,T,T);
          URL.revokeObjectURL(url);
          c.toBlob(function(b){ b?ok(b):ko(0) },'image/jpeg',.82);
        }catch(e){ko(e)}
      };
      img.onerror=function(){URL.revokeObjectURL(url);ko(0)};
      img.src=url;
    });
  }
  function televerser(fichier){
    if(!fichier||!/^image\//.test(fichier.type)) return Promise.resolve(null);
    var nom=(window.crypto&&crypto.randomUUID?crypto.randomUUID():Date.now().toString(36)+'-'+Math.random().toString(36).slice(2,10))+'.jpg';
    return reduire(fichier).then(function(blob){
      return fetch(SB+'/storage/v1/object/portraits/'+nom,{method:'POST',headers:{apikey:SBK,Authorization:'Bearer '+SBK,'Content-Type':'image/jpeg','x-upsert':'false'},body:blob})
        .then(function(r){ return r.ok?nom:null; });
    }).catch(function(){return null});
  }

  /* ---------- Chiffres à rouleaux : chaque chiffre est une colonne de 0 à 9 qui glisse ---------- */
  function rouleau(elm,valeur){
    if(!elm)return;
    var txt=fmt(valeur); if(elm.getAttribute('data-txt')===txt)return;
    var chars=txt.split(''), forme=chars.map(function(c){return /\d/.test(c)?'d':'s'}).join('');
    if(elm.getAttribute('data-forme')!==forme){
      elm.innerHTML='';
      chars.forEach(function(c){
        if(/\d/.test(c)){var col=hel('span','col'),pile=hel('span','pile');for(var d=0;d<10;d++)pile.appendChild(hel('span',null,String(d)));col.appendChild(pile);elm.appendChild(col);}
        else elm.appendChild(hel('span','sep',c));
      });
      elm.setAttribute('data-forme',forme); elm.classList.add('rouleau');
      void elm.offsetWidth; // les nouvelles colonnes partent de 0
    }
    var piles=elm.querySelectorAll('.pile'), k=0;
    chars.forEach(function(c){ if(/\d/.test(c)){ piles[k].style.transitionDelay=reduit?'0ms':(k*40)+'ms'; piles[k].style.transform='translateY(-'+(+c)+'em)'; k++; } });
    elm.setAttribute('data-txt',txt); elm.setAttribute('aria-label',txt);
  }

  /* ---------- Bulle : une seule par page, ouverte sur la place cliquée ---------- */
  var bulle=null, ancre=null;
  function laBulle(){
    if(bulle)return bulle;
    bulle=hel('div','bulle'); bulle.setAttribute('role','dialog'); bulle.hidden=true; document.body.appendChild(bulle);
    document.addEventListener('click',function(e){ if(!bulle.hidden&&!bulle.contains(e.target)&&!(ancre&&ancre.contains(e.target))) fermer(); });
    document.addEventListener('keydown',function(e){ if(e.key==='Escape') fermer(); });
    window.addEventListener('scroll',function(){ if(!bulle.hidden) placer(); },{passive:true});
    window.addEventListener('resize',function(){ if(!bulle.hidden) placer(); });
    return bulle;
  }
  function fermer(){ if(!bulle||bulle.hidden)return; bulle.hidden=true; if(ancre)ancre.setAttribute('aria-expanded','false'); ancre=null; }
  function placer(){
    if(!ancre)return; var r=ancre.getBoundingClientRect(), b=bulle.getBoundingClientRect();
    var x=Math.max(8,Math.min(window.innerWidth-b.width-8,r.left+r.width/2-b.width/2));
    var y=r.top-b.height-12, dessous=false; if(y<8){y=r.bottom+12;dessous=true;}
    bulle.style.left=x+'px'; bulle.style.top=y+'px'; bulle.classList.toggle('dessous',dessous);
    var fleche=Math.max(14,Math.min(b.width-14,r.left+r.width/2-x)); bulle.style.setProperty('--fleche',fleche+'px');
  }
  function ouvrir(cible,t){
    var b=laBulle(); b.innerHTML='';
    if(t.photo){ var im=hel('img','portrait'); im.src=photoUrl(t.photo); im.alt=''; im.width=64; im.height=64; b.appendChild(im); b.classList.add('avec-photo'); } else b.classList.remove('avec-photo');
    var txt=hel('div','texte'); txt.appendChild(hel('b',null,t.titre)); txt.appendChild(hel('span',null,t.texte));
    if(t.lien){var a=hel('a',null,t.lien.texte);a.href=t.lien.href;txt.appendChild(a);}
    b.appendChild(txt);
    if(ancre)ancre.setAttribute('aria-expanded','false');
    ancre=cible; cible.setAttribute('aria-expanded','true');
    b.hidden=false; placer();
  }
  // Texte de la bulle pour une place donnée.
  function texteDe(genre,n,occupe,personne,liens){
    var nom=personne&&personne.nom||'', photo=personne&&personne.photo||'';
    if(genre==='fenetre'){
      if(!occupe) return {titre:'Fenêtre '+n,texte:'Encore libre.',lien:liens&&liens.fenetre?{href:liens.fenetre,texte:'Tu pourrais être là'}:null};
      return {titre:'Fenêtre '+n,texte:nom?nom+', y vivra':'Quelqu’un y vivra (prénom non affiché)',photo:photo};
    }
    if(!occupe) return {titre:'Brique '+n,texte:'À poser : 1 000 € prêtés à 0 %, remboursés.',lien:liens&&liens.brique?{href:liens.brique,texte:'Comptez-vous parmi les 120'}:null};
    return {titre:'Brique '+n,texte:nom?nom+', a promis 1 000 €':'Une promesse de 1 000 € (nom non affiché)',photo:photo};
  }
  function personneDe(p){ return {nom:p.getAttribute('data-nom')||'',photo:p.getAttribute('data-photo')||''}; }
  // Rend une liste de places cliquables. places : tableau indexé par n (1..N) d'éléments.
  function brancher(places,genre,liens){
    places.forEach(function(p,n){
      if(!p||p.getAttribute('data-branche'))return; p.setAttribute('data-branche','1');
      p.setAttribute('tabindex','0'); p.setAttribute('role','button'); p.setAttribute('aria-expanded','false');
      function clic(e){ e.preventDefault(); e.stopPropagation();
        if(ancre===p){fermer();return}
        ouvrir(p,texteDe(genre,n,p.classList.contains('on'),personneDe(p),liens)); }
      p.addEventListener('click',clic);
      p.addEventListener('keydown',function(e){ if(e.key==='Enter'||e.key===' ')clic(e); });
    });
  }
  // Pose (ou retire) la photo sur une place : <image> dans le SVG, fond d'image sur une brique HTML.
  function garnir(p,genre,n,occupe,personne){
    var nom=personne&&personne.nom||'', photo=occupe&&personne&&personne.photo||'';
    p.setAttribute('data-nom',nom); p.setAttribute('data-photo',photo);
    var t=texteDe(genre,n,occupe,{nom:nom,photo:photo}); p.setAttribute('aria-label',t.titre+', '+t.texte);
    if(p.namespaceURI===NS){
      var im=p.querySelector('image');
      if(photo){ if(!im){ var r=p.querySelector('rect.base'); im=el('image',{x:r.getAttribute('x'),y:r.getAttribute('y'),width:r.getAttribute('width'),height:r.getAttribute('height'),preserveAspectRatio:'xMidYMid slice','class':'portrait'},p); }
        if(im.getAttribute('href')!==photoUrl(photo)) im.setAttribute('href',photoUrl(photo)); p.classList.add('photo'); }
      else { if(im)im.remove(); p.classList.remove('photo'); }
    } else {
      if(photo){ p.style.backgroundImage='url("'+photoUrl(photo)+'")'; p.classList.add('photo'); } else { p.style.backgroundImage=''; p.classList.remove('photo'); }
    }
  }
  // Met à jour l'état des places : n ≤ total = occupée ; personnes si connues. anime : allumage dispersé à 60 ms d'écart.
  function allumer(places,genre,total,personnes,anime){
    var ordre=[];
    places.forEach(function(p,n){ if(!p)return; var occupe=n<=total; garnir(p,genre,n,occupe,personnes&&personnes[n]);
      if(!occupe){p.classList.remove('on');return}
      if(p.classList.contains('on'))return; ordre.push(p); });
    if(!anime||reduit){ordre.forEach(function(p){p.classList.add('on')});return}
    // dispersé : ordre fixe mais mélangé (multiplication par 37 modulo 101)
    ordre.sort(function(a,b){return ((+a.getAttribute('data-n'))*37)%101-((+b.getAttribute('data-n'))*37)%101});
    ordre.forEach(function(p,k){ setTimeout(function(){p.classList.add('on')},k*60); });
  }
  // La place n vient d'être prise : elle s'éclaire une fois, quand elle passe à l'écran.
  function eclairer(places,n,genre,personne){
    var p=places[n]; if(!p)return;
    observer(p,function(){ if(genre)garnir(p,genre,n,true,personne); p.classList.add('on'); p.classList.add('neuve'); },.5);
  }

  /* ---------- Façade SVG : 5 étages × 10 fenêtres, numérotées du bas vers le haut ; mur de 120 briques en option ---------- */
  function facade(svg,opts){
    opts=opts||{};
    var W=500, x0=40, y0=58, cw=42, ch=58, Hf=420;
    var Hm=opts.mur?8*22+18:0;
    svg.setAttribute('viewBox','0 0 '+W+' '+(Hf+Hm)); svg.innerHTML='';
    el('rect',{x:24,y:40,width:452,height:356,fill:'#172E21',stroke:'#3C5646','stroke-width':1.5},svg);
    el('rect',{x:14,y:28,width:472,height:14,fill:'#E3C362'},svg);
    for(var r=0;r<5;r++)el('line',{x1:24,x2:476,y1:y0+r*62+ch+2,y2:y0+r*62+ch+2,stroke:'#2A4535','stroke-width':1},svg);
    var fens=[];
    for(var r=0;r<5;r++)for(var c=0;c<10;c++){
      var n=(4-r)*10+c+1, x=x0+c*cw+(c>4?8:0), y=y0+r*62;
      var g=el('g',{'class':'fen','data-n':n},svg);
      el('rect',{'class':'base',x:x,y:y,width:26,height:ch-18,rx:1},g);
      el('rect',{'class':'veille',x:x,y:y,width:26,height:ch-18,rx:1,style:'--d:'+((n*173)%6000)+'ms'},g);
      fens[n]=g;
    }
    el('rect',{x:222,y:340,width:56,height:56,fill:'#E3C362'},svg);
    el('rect',{x:0,y:396,width:W,height:3,fill:'#3C5646'},svg);
    var briques=[];
    if(opts.mur){
      // 8 rangées de 15 briques, joints décalés : sur les rangées décalées, les deux demi-briques des bouts sont la même brique.
      var bw=(452-14*3)/15, bh=19, gy=Hf+8;
      el('rect',{x:24,y:Hf+2,width:452,height:Hm-2,fill:'#0B1710'},svg);
      for(var r=0;r<8;r++){
        var dec=r%2===1, y=gy+(7-r)*22, k=0, n;
        var base=r*15;
        if(dec){ n=base+1; briques[n]=el('g',{'class':'brique','data-n':n},svg);
          el('rect',{'class':'base',x:24,y:y,width:bw/2-1.5,height:bh,rx:1},briques[n]);
          el('rect',{'class':'base bis',x:24+452-(bw/2-1.5),y:y,width:bw/2-1.5,height:bh,rx:1},briques[n]); k=1; }
        var pleines=dec?14:15;
        for(var j=0;j<pleines;j++){ n=base+k+1; var x=24+(dec?bw/2+1.5:0)+j*(bw+3);
          briques[n]=el('g',{'class':'brique','data-n':n},svg); el('rect',{'class':'base',x:x,y:y,width:bw,height:bh,rx:1},briques[n]); k++; }
      }
    }
    return {fens:fens,briques:briques};
  }

  window.Batiment={charger:charger,inscrire:inscrire,televerser:televerser,photoUrl:photoUrl,rouleau:rouleau,facade:facade,brancher:brancher,allumer:allumer,eclairer:eclairer,fermer:fermer,observer:observer,reduit:reduit};
})();
