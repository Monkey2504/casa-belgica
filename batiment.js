/* Sortir du squat — le bâtiment vivant (direction « La façade »).
   50 fenêtres (une par personne inscrite pour y vivre), 120 briques (une par promesse de prêt de 1 000 €).

   Ce fichier fait tout ce qui bouge sur les pages ; les pages ne contiennent que leur texte et une ligne d'appel :
     <script src="batiment.js"></script><script>Batiment.entree()</script>    (ou .habiter() / .preter())
   1. Données : RPC compteur() et facade() sur Supabase (une reprise si ça échoue), inscription, envoi de la photo.
   2. Dessin : la façade (5 étages × 10 fenêtres + rez-de-chaussée de 120 briques), la même sur les trois pages.
      Elle est dessinée ici, au chargement, à la place du bloc <div data-dessin="facade"> de la page (qui réserve déjà sa place).
   3. Mouvement : les fenêtres s'allument et les briques se posent une à une depuis 0 (décalage 40 ms / 25 ms, 220 ms chacune),
      la plaque compte au même rythme, la séquence entière tient en 2 s au plus. Rien ne bouge si la réduction de mouvement est demandée.
   4. Textes produits par le script (bulles, listes, messages des formulaires, titres des dessins) : dictionnaire TEXTES, une entrée
      par langue. La langue est celle de <html lang="…">. Une phrase absente d'une langue s'affiche en français.
      Les textes écrits dans la page (y compris singulier/pluriel : data-un / data-plus) se traduisent dans la page elle-même.
   Nom et photo n'apparaissent que si la personne l'a accepté. ?sim dans l'adresse : 12 habitants, 37 prêteurs, sans réseau (captures). */
(function(){
  'use strict';
  var SB='https://gjvxwijhowbyhfwlybvt.supabase.co';
  var SBK='sb_publishable_MApC_iB8eu_2nHWhnE3iaA_PzRLqS2y';
  var SIMULATION=/[?&]sim\b/.test(location.search);
  var reduit=!!(window.matchMedia&&matchMedia('(prefers-reduced-motion: reduce)').matches);
  // Rythme de la séquence d'ouverture (voir DIRECTION-ARTISTIQUE.md, « Mouvement »)
  var DEC_FEN=40, DEC_BRI=25, TRANSITION=220, PLAFOND=2000;
  var DELAI=3000; // au-delà, on affiche 0 sans attendre ; une réponse plus tardive est posée sans animation
  var SEUIL=3;    // sous 3 promesses de prêt, les chiffres de prêt laissent la place à « Les premières briques se posent »

  var LANG=((document.documentElement.getAttribute('lang')||'fr').slice(0,2)).toLowerCase();
  var LOCALE={fr:'fr-BE',en:'en-GB',de:'de-DE',nl:'nl-BE',ar:'fr-BE'}[LANG]||'fr-BE';
  function fmt(v){ return Math.max(0,v|0).toLocaleString(LOCALE); }

  /* ---------- Textes produits par le script, par langue ---------- */
  var TEXTES={
    fr:{
      // titres et descriptions lus des dessins
      facadeTitre:'La façade de Casa Belgica',
      facadeDesc:'Élévation d’un immeuble de cinq étages à dix fenêtres, soit 50 chambres. Chaque fenêtre s’allume quand une personne s’inscrit pour y vivre. Le rez-de-chaussée est un mur de 120 briques : chaque brique se pose quand quelqu’un promet de prêter 1 000 euros.',
      // résumé lu par les lecteurs d'écran
      resumeFen:function(n){ return n+(n===1?' fenêtre allumée':' fenêtres allumées')+' sur 50'; },
      resumeBri:function(n){ return n+(n===1?' brique posée':' briques posées')+' sur 120'; },
      // listes « Voir qui habite » / « Voir les prêteurs » et remplissage par étage
      etageListe:function(n,nom){ return 'Étage '+n+' ('+nom+')'; },
      deuxPoints:' : ', virgule:', ',
      vide:'Personne pour l’instant.', chargement:'Chargement…', echec:'La liste n’a pas pu être chargée.',
      anonymes:function(n){ return n+(n>1?' personnes':' personne')+' sans nom affiché'; },
      etagesAria:function(e,nom,n,t){ return 'Étage '+e+', '+nom+' : '+n+' sur '+t; },
      // bulles (clic sur une fenêtre ou une brique)
      fenetre:function(n){ return 'Fenêtre '+n; }, libre:'Encore libre.', lienFenetre:'Tu pourrais être là',
      yVivra:function(nom){ return nom+', y vivra'; }, anonymeHab:'Quelqu’un y vivra (prénom non affiché)',
      brique:function(n){ return 'Brique '+n; }, aPoser:'À poser : 1 000 € prêtés à 0 %, remboursés.', lienBrique:'Devenir l’un des 120',
      aPromis:function(nom){ return nom+', a promis 1 000 €'; }, anonymePret:'Une promesse de 1 000 € (nom non affiché)',
      // formulaires (communs)
      merci:'Merci.', envoi:'Envoi…',
      // formulaire habitant (page habiter)
      hNomContact:'Il manque ton prénom ou un moyen de te joindre.',
      hTelephone:'Il manque ton numéro de téléphone : sans lui, l’inscription ne part pas.',
      hAffiche:'Réponds oui ou non : ton prénom peut apparaître sur la fenêtre, ou pas.',
      hReferent:'Il manque le prénom de ta personne référente : sans lui, l’inscription ne part pas.',
      hAccord:'Coche la case « J’ai lu la notice et j’accepte » : sans ton accord, l’inscription ne part pas.',
      hSuite:function(affiche,photo,ratee){ return (affiche?(photo?', avec ton prénom et ta photo dessus':', avec ton prénom dessus'):'')+'. On te recontacte, et tu restes bienvenu·e au 645 chaussée de Gand dès maintenant.'+(ratee?' La photo n’est pas passée : tu peux nous l’envoyer par e-mail.':''); },
      hNote:function(nom){ return 'C’est noté, '+nom+'. On garde ta place dans la liste et on te recontacte. Tu restes bienvenu·e au 645 chaussée de Gand dès maintenant.'; },
      hFenetre:function(nom,etage,ref,n,suite){ return 'C’est noté, '+nom+'. Tu es sur l’étage '+etage+', celui de '+ref+' : fenêtre '+n+suite; },
      hAttente:function(nom,ref,k,suite){ return 'C’est noté, '+nom+'. L’étage de '+ref+' est complet, tu es sur sa liste d’attente ('+k+'e personne)'+suite; },
      // formulaire de promesse (page prêter)
      pNomContact:'Il manque votre nom ou un moyen de vous joindre.',
      pAffiche:'Répondez oui ou non : votre nom peut apparaître sur la brique, ou pas.',
      pAccord:'Cochez la case « J’ai lu la notice et j’accepte » : sans votre accord, la promesse ne part pas.',
      pPosee:function(nom){ return 'Merci, '+nom+'. Ta brique est posée. On ne collecte rien avant 18 à 21 mois : on te recontacte quand le dossier tient.'; },
      pNumero:function(nom,t,affiche,photo,ratee){ return 'Merci, '+nom+'. Ta brique est la n°'+t+' sur 120'+(affiche?(photo?', avec ton nom et ta photo dessus':', avec ton nom dessus'):'')+'. On ne collecte rien avant 18 à 21 mois : on te recontacte quand le dossier tient.'+(ratee?' La photo n’est pas passée : vous pouvez nous l’envoyer par e-mail.':''); },
      pAuDela:function(nom,t){ return 'Merci, '+nom+'. Les 120 briques sont promises, tu es la '+t+'e promesse. On ne collecte rien avant 18 à 21 mois : on te recontacte quand le dossier tient.'; }
    },
    /* Les autres langues. Une clé absente s'afficherait en français : comparer avec fr après tout ajout (README.md). */
    en:{
      facadeTitre:'The façade of Casa Belgica',
      facadeDesc:'Elevation of a five-storey building with ten windows per floor, making 50 rooms. Each window lights up when someone signs up to live there. The ground floor is a wall of 120 bricks: each brick is laid when someone pledges to lend 1,000 euros.',
      resumeFen:function(n){ return n+(n===1?' window lit':' windows lit')+' out of 50'; },
      resumeBri:function(n){ return n+(n===1?' brick laid':' bricks laid')+' out of 120'; },
      etageListe:function(n,nom){ return 'Floor '+n+' ('+nom+')'; }, deuxPoints:': ', virgule:', ',
      vide:'Nobody yet.', chargement:'Loading…', echec:'The list could not be loaded.',
      anonymes:function(n){ return n+(n>1?' people':' person')+' with no name shown'; },
      etagesAria:function(e,nom,n,t){ return 'Floor '+e+', '+nom+': '+n+' of '+t; },
      fenetre:function(n){ return 'Window '+n; }, libre:'Still free.', lienFenetre:'You could be here',
      yVivra:function(nom){ return nom+', will live here'; }, anonymeHab:'Someone will live here (name not shown)',
      brique:function(n){ return 'Brick '+n; }, aPoser:'To be laid: €1,000 lent at 0%, paid back.', lienBrique:'Become one of the 120',
      aPromis:function(nom){ return nom+', pledged €1,000'; }, anonymePret:'A €1,000 pledge (name not shown)',
      merci:'Thanks.', envoi:'Sending…',
      hNomContact:'Your first name or a way to reach you is missing.',
      hTelephone:'Your phone number is missing: without it, the sign-up won’t go through.',
      hAffiche:'Answer yes or no: your first name can appear on the window, or not.',
      hReferent:'Your referent’s first name is missing: without it, the sign-up can’t be sent.',
      hAccord:'Tick the box “I have read the notice and I agree”: without your consent, the sign-up won’t go through.',
      hSuite:function(affiche,photo,ratee){ return (affiche?(photo?', with your first name and your photo on it':', with your first name on it'):'')+'. We’ll get back in touch, and you’re welcome at 645 chaussée de Gand from right now.'+(ratee?' The photo didn’t go through: you can send it to us by e-mail.':''); },
      hNote:function(nom){ return 'Noted, '+nom+'. We’re keeping your place on the list and we’ll get back in touch. You’re welcome at 645 chaussée de Gand from right now.'; },
      hFenetre:function(nom,etage,ref,n,suite){ return 'Noted, '+nom+'. You’re on floor '+etage+', '+ref+'’s floor: window '+n+suite; },
      hAttente:function(nom,ref,k,suite){ return 'Noted, '+nom+'. '+ref+'’s floor is full, you’re on its waiting list (number '+k+')'+suite; },
      pNomContact:'Your name or a way to reach you is missing.',
      pAffiche:'Answer yes or no: your name can appear on the brick, or not.',
      pAccord:'Tick the box “I have read the notice and I agree”: without your consent, the pledge won’t go through.',
      pPosee:function(nom){ return 'Thank you, '+nom+'. Your brick is laid. We collect nothing for 18 to 21 months: we will get back to you once the case holds together.'; },
      pNumero:function(nom,t,affiche,photo,ratee){ return 'Thank you, '+nom+'. Your brick is no. '+t+' of 120'+(affiche?(photo?', with your name and your photo on it':', with your name on it'):'')+'. We collect nothing for 18 to 21 months: we will get back to you once the case holds together.'+(ratee?' The photo did not go through: you can send it to us by e-mail.':''); },
      pAuDela:function(nom,t){ return 'Thank you, '+nom+'. All 120 bricks are pledged, you are pledge number '+t+'. We collect nothing for 18 to 21 months: we will get back to you once the case holds together.'; }
    },
    de:{
      facadeTitre:'Die Fassade von Casa Belgica',
      facadeDesc:'Ansicht eines Gebäudes mit fünf Etagen zu je zehn Fenstern, also 50 Zimmern. Jedes Fenster leuchtet auf, wenn sich eine Person einträgt, um dort zu wohnen. Das Erdgeschoss ist eine Mauer aus 120 Steinen: Jeder Stein wird gesetzt, wenn jemand zusagt, 1.000 Euro zu leihen.',
      resumeFen:function(n){ return n+(n===1?' erleuchtetes Fenster':' erleuchtete Fenster')+' von 50'; },
      resumeBri:function(n){ return n+(n===1?' gesetzter Stein':' gesetzte Steine')+' von 120'; },
      etageListe:function(n,nom){ return 'Etage '+n+' ('+nom+')'; }, deuxPoints:': ', virgule:', ',
      vide:'Noch niemand.', chargement:'Wird geladen…', echec:'Die Liste konnte nicht geladen werden.',
      anonymes:function(n){ return n+(n>1?' Personen':' Person')+' ohne angezeigten Namen'; },
      etagesAria:function(e,nom,n,t){ return 'Etage '+e+', '+nom+': '+n+' von '+t; },
      fenetre:function(n){ return 'Fenster '+n; }, libre:'Noch frei.', lienFenetre:'Du könntest hier sein',
      yVivra:function(nom){ return nom+', wird hier wohnen'; }, anonymeHab:'Jemand wird hier wohnen (Name nicht angezeigt)',
      brique:function(n){ return 'Stein '+n; }, aPoser:'Noch zu setzen: 1.000 € zu 0 % geliehen, zurückgezahlt.', lienBrique:'Zu den 120 gehören',
      aPromis:function(nom){ return nom+', hat 1.000 € zugesagt'; }, anonymePret:'Eine Zusage über 1.000 € (Name nicht angezeigt)',
      merci:'Danke.', envoi:'Wird gesendet…',
      hNomContact:'Es fehlt dein Vorname oder eine Möglichkeit, dich zu erreichen.',
      hTelephone:'Deine Telefonnummer fehlt: ohne sie wird die Anmeldung nicht abgeschickt.',
      hAffiche:'Antworte mit Ja oder Nein: dein Vorname kann am Fenster erscheinen, oder nicht.',
      hReferent:'Es fehlt der Vorname deiner Bezugsperson: ohne ihn geht die Eintragung nicht raus.',
      hAccord:'Kreuz das Kästchen „Ich habe den Hinweis gelesen und bin einverstanden“ an: ohne deine Einwilligung wird die Anmeldung nicht abgeschickt.',
      hSuite:function(affiche,photo,ratee){ return (affiche?(photo?', mit deinem Vornamen und deinem Foto darauf':', mit deinem Vornamen darauf'):'')+'. Wir melden uns bei dir, und du bist ab sofort in der 645 chaussée de Gand willkommen.'+(ratee?' Das Foto ist nicht durchgekommen: du kannst es uns per E-Mail schicken.':''); },
      hNote:function(nom){ return 'Notiert, '+nom+'. Wir halten deinen Platz auf der Liste frei und melden uns bei dir. Du bist ab sofort in der 645 chaussée de Gand willkommen.'; },
      hFenetre:function(nom,etage,ref,n,suite){ return 'Notiert, '+nom+'. Du bist auf Etage '+etage+', der von '+ref+': Fenster '+n+suite; },
      hAttente:function(nom,ref,k,suite){ return 'Notiert, '+nom+'. Die Etage von '+ref+' ist voll, du stehst auf der Warteliste ('+k+'. Person)'+suite; },
      pNomContact:'Es fehlt Ihr Name oder eine Möglichkeit, Sie zu erreichen.',
      pAffiche:'Antworten Sie mit Ja oder Nein: Ihr Name kann auf dem Stein erscheinen, oder nicht.',
      pAccord:'Kreuzen Sie das Kästchen „Ich habe den Hinweis gelesen und bin einverstanden“ an: ohne Ihre Einwilligung wird die Zusage nicht abgeschickt.',
      pPosee:function(nom){ return 'Danke, '+nom+'. Ihr Stein ist gesetzt. Wir sammeln nichts vor 18 bis 21 Monaten: wir melden uns bei Ihnen, wenn das Dossier steht.'; },
      pNumero:function(nom,t,affiche,photo,ratee){ return 'Danke, '+nom+'. Ihr Stein ist Nr. '+t+' von 120'+(affiche?(photo?', mit Ihrem Namen und Ihrem Foto darauf':', mit Ihrem Namen darauf'):'')+'. Wir sammeln nichts vor 18 bis 21 Monaten: wir melden uns bei Ihnen, wenn das Dossier steht.'+(ratee?' Das Foto ist nicht durchgekommen: Sie können es uns per E-Mail schicken.':''); },
      pAuDela:function(nom,t){ return 'Danke, '+nom+'. Alle 120 Steine sind zugesagt, Sie sind die '+t+'. Zusage. Wir sammeln nichts vor 18 bis 21 Monaten: wir melden uns bei Ihnen, wenn das Dossier steht.'; }
    },
    nl:{
      facadeTitre:'De gevel van Casa Belgica',
      facadeDesc:'Vooraanzicht van een gebouw met vijf verdiepingen van tien ramen, samen 50 kamers. Elk raam licht op wanneer iemand zich inschrijft om er te wonen. Het gelijkvloers is een muur van 120 stenen: elke steen wordt gelegd wanneer iemand belooft 1.000 euro te lenen.',
      resumeFen:function(n){ return n+(n===1?' verlicht raam':' verlichte ramen')+' van de 50'; },
      resumeBri:function(n){ return n+(n===1?' gelegde steen':' gelegde stenen')+' van de 120'; },
      etageListe:function(n,nom){ return 'Verdieping '+n+' ('+nom+')'; }, deuxPoints:': ', virgule:', ',
      vide:'Nog niemand.', chargement:'Laden…', echec:'De lijst kon niet geladen worden.',
      anonymes:function(n){ return n+(n>1?' personen':' persoon')+' zonder getoonde naam'; },
      etagesAria:function(e,nom,n,t){ return 'Verdieping '+e+', '+nom+': '+n+' van '+t; },
      fenetre:function(n){ return 'Raam '+n; }, libre:'Nog vrij.', lienFenetre:'Jij zou hier kunnen zijn',
      yVivra:function(nom){ return nom+', zal hier wonen'; }, anonymeHab:'Iemand zal hier wonen (naam niet getoond)',
      brique:function(n){ return 'Steen '+n; }, aPoser:'Nog te leggen: € 1.000 geleend aan 0 %, terugbetaald.', lienBrique:'Word een van de 120',
      aPromis:function(nom){ return nom+', beloofde € 1.000'; }, anonymePret:'Een belofte van € 1.000 (naam niet getoond)',
      merci:'Bedankt.', envoi:'Verzenden…',
      hNomContact:'Je voornaam ontbreekt, of een manier om je te bereiken.',
      hTelephone:'Je telefoonnummer ontbreekt: zonder dat wordt de inschrijving niet verstuurd.',
      hAffiche:'Antwoord ja of nee: je voornaam kan op het raam verschijnen, of niet.',
      hReferent:'De voornaam van je referentiepersoon ontbreekt: zonder die vertrekt de inschrijving niet.',
      hAccord:'Vink het vakje „Ik heb de kennisgeving gelezen en ga akkoord” aan: zonder je toestemming wordt de inschrijving niet verstuurd.',
      hSuite:function(affiche,photo,ratee){ return (affiche?(photo?', met je voornaam en je foto erop':', met je voornaam erop'):'')+'. We nemen opnieuw contact met je op, en je blijft vanaf nu welkom op 645 chaussée de Gand.'+(ratee?' De foto is niet doorgekomen: je kan ze ons per e-mail sturen.':''); },
      hNote:function(nom){ return 'Genoteerd, '+nom+'. We houden je plaats in de lijst en we nemen opnieuw contact met je op. Je blijft vanaf nu welkom op 645 chaussée de Gand.'; },
      hFenetre:function(nom,etage,ref,n,suite){ return 'Genoteerd, '+nom+'. Je zit op verdieping '+etage+', die van '+ref+': raam '+n+suite; },
      hAttente:function(nom,ref,k,suite){ return 'Genoteerd, '+nom+'. De verdieping van '+ref+' is vol, je staat op de wachtlijst ('+k+'e persoon)'+suite; },
      pNomContact:'Uw naam ontbreekt, of een manier om u te bereiken.',
      pAffiche:'Antwoord ja of nee: uw naam kan op de steen verschijnen, of niet.',
      pAccord:'Vink het vakje „Ik heb de kennisgeving gelezen en ga akkoord” aan: zonder uw toestemming wordt de belofte niet verstuurd.',
      pPosee:function(nom){ return 'Bedankt, '+nom+'. Uw steen is gelegd. We zamelen niets in vóór 18 tot 21 maanden: we komen bij u terug wanneer het dossier standhoudt.'; },
      pNumero:function(nom,t,affiche,photo,ratee){ return 'Bedankt, '+nom+'. Uw steen is nummer '+t+' van de 120'+(affiche?(photo?', met uw naam en uw foto erop':', met uw naam erop'):'')+'. We zamelen niets in vóór 18 tot 21 maanden: we komen bij u terug wanneer het dossier standhoudt.'+(ratee?' De foto is niet doorgekomen: u kan ze ons per e-mail sturen.':''); },
      pAuDela:function(nom,t){ return 'Bedankt, '+nom+'. De 120 stenen zijn beloofd, u bent de '+t+'e belofte. We zamelen niets in vóór 18 tot 21 maanden: we komen bij u terug wanneer het dossier standhoudt.'; }
    },
    ar:{
      facadeTitre:'واجهة Casa Belgica',
      facadeDesc:'واجهة مبنى من خمسة طوابق، في كل طابق عشر نوافذ، أي 50 غرفة. تُضاء كل نافذة عندما يسجّل شخص اسمه للسكن فيها. الطابق الأرضي جدار من 120 طوبة: تُوضع كل طوبة عندما يَعِد أحدهم بإقراض 1 000 يورو.',
      resumeFen:function(n){ return n+' '+(n===1?'نافذة مضاءة':'نوافذ مضاءة')+' من أصل 50'; },
      resumeBri:function(n){ return n+' '+(n===1?'طوبة موضوعة':'طوبات موضوعة')+' من أصل 120'; },
      etageListe:function(n,nom){ return 'الطابق '+n+' ('+nom+')'; }, deuxPoints:': ', virgule:'، ',
      vide:'لا أحد حتى الآن.', chargement:'جارٍ التحميل…', echec:'تعذّر تحميل القائمة.',
      anonymes:function(n){ return 'أشخاص بدون اسم معروض: '+n; },
      etagesAria:function(e,nom,n,t){ return 'الطابق '+e+'، '+nom+' : '+n+' من '+t; },
      fenetre:function(n){ return 'النافذة '+n; }, libre:'ما زالت شاغرة.', lienFenetre:'يمكن أن تكون هنا',
      yVivra:function(nom){ return nom+'، سيسكن هنا'; }, anonymeHab:'شخص سيسكن هنا (الاسم غير معروض)',
      brique:function(n){ return 'الطوبة '+n; }, aPoser:'لم توضع بعد: 1 000 € قرض بدون فائدة، يُرَدّ.', lienBrique:'كونوا واحدًا من الـ 120',
      aPromis:function(nom){ return nom+'، وعد بـ 1 000 €'; }, anonymePret:'وعد بـ 1 000 € (الاسم غير معروض)',
      merci:'شكرًا.', envoi:'جارٍ الإرسال…',
      hNomContact:'ينقص اسمك الأول أو وسيلة للتواصل معك.',
      hTelephone:'ينقص رقم هاتفك: بدونه لا يتم إرسال التسجيل.',
      hAffiche:'أجب بنعم أو لا: يمكن أن يظهر اسمك على النافذة، أو لا.',
      hReferent:'ينقص اسم الشخص المرجعي لك: بدونه لا يُرسَل التسجيل.',
      hAccord:'ضع علامة في خانة «قرأتُ الإشعار وأوافق»: بدون موافقتك لا يُرسَل التسجيل.',
      hSuite:function(affiche,photo,ratee){ return (affiche?(photo?'، وعليها اسمك وصورتك':'، وعليها اسمك'):'')+'. سنتواصل معك، وأنت مرحّب بك في 645 chaussée de Gand من الآن.'+(ratee?' لم تصل الصورة: يمكنك إرسالها لنا بالبريد الإلكتروني.':''); },
      hNote:function(nom){ return 'تمّ التسجيل، '+nom+'. نحفظ مكانك في القائمة وسنتواصل معك. أنت مرحّب بك في 645 chaussée de Gand من الآن.'; },
      hFenetre:function(nom,etage,ref,n,suite){ return 'تمّ التسجيل، '+nom+'. أنت في الطابق '+etage+'، طابق '+ref+': النافذة '+n+suite; },
      hAttente:function(nom,ref,k,suite){ return 'تمّ التسجيل، '+nom+'. طابق '+ref+' ممتلئ، أنت على قائمة انتظاره (الشخص رقم '+k+')'+suite; },
      pNomContact:'ينقص اسمكم أو وسيلة للتواصل معكم.',
      pAffiche:'أجيبوا بنعم أو لا: يمكن أن يظهر اسمكم على الطوبة، أو لا.',
      pAccord:'ضعوا علامة في خانة «قرأتُ الإشعار وأوافق»: بدون موافقتكم لا يُرسَل الوعد.',
      pPosee:function(nom){ return 'شكرًا، '+nom+'. طوبتكم وُضعت. لا نجمع شيئًا قبل 18 إلى 21 شهرًا: نعود إليكم حين يكتمل الملف.'; },
      pNumero:function(nom,t,affiche,photo,ratee){ return 'شكرًا، '+nom+'. طوبتكم هي رقم '+t+' من أصل 120'+(affiche?(photo?'، وعليها اسمكم وصورتكم':'، وعليها اسمكم'):'')+'. لا نجمع شيئًا قبل 18 إلى 21 شهرًا: نعود إليكم حين يكتمل الملف.'+(ratee?' لم تصل الصورة: يمكنكم إرسالها لنا بالبريد الإلكتروني.':''); },
      pAuDela:function(nom,t){ return 'شكرًا، '+nom+'. الطوبات الـ 120 كلها موعود بها، وأنتم الوعد رقم '+t+'. لا نجمع شيئًا قبل 18 إلى 21 شهرًا: نعود إليكم حين يكتمل الملف.'; }
    }
  };
  var T={}, k;
  for(k in TEXTES.fr) T[k]=TEXTES.fr[k];
  if(TEXTES[LANG]) for(k in TEXTES[LANG]) T[k]=TEXTES[LANG][k];

  function $(id){ return document.getElementById(id); }
  function tous(sel,racine){ return Array.prototype.slice.call((racine||document).querySelectorAll(sel)); }
  function hel(n,cls,txt){ var e=document.createElement(n); if(cls)e.className=cls; if(txt!=null)e.textContent=txt; return e; }
  function esc(t){ return String(t).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;'); }
  function photoUrl(nom){ return nom?SB+'/storage/v1/object/public/portraits/'+nom:null; }

  // Les cinq personnes référentes, une par étage. Une personne inscrite rejoint l'étage de sa personne référente (10 places).
  var REFERENTS=[{nom:'Telly',etage:1},{nom:'François',etage:2},{nom:'Cissé',etage:3},{nom:'Delya',etage:4},{nom:'Ibrahim',etage:5}];
  var PAR_ETAGE=10;
  function normaliser(t){ return (t||'').trim().toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g,''); }
  function referentDe(nom){ var n=normaliser(nom); for(var i=0;i<REFERENTS.length;i++) if(normaliser(REFERENTS[i].nom)===n) return REFERENTS[i]; return null; }
  function fenetreDe(R,k){ return (R&&k>=1&&k<=PAR_ETAGE)?(R.etage-1)*10+k:0; }

  /* ================= 1. Données ================= */
  function rpc(nom){
    return fetch(SB+'/rest/v1/rpc/'+nom,{method:'POST',headers:{apikey:SBK,'Content-Type':'application/json'},body:'{}'})
      .then(function(r){ if(!r.ok)throw 0; return r.json(); });
  }
  // Une reprise avant d'abandonner : un réseau mobile perd parfois une des deux requêtes en vol.
  function rpcAvecReprise(nom){ return rpc(nom).catch(function(){ return rpc(nom); }); }
  function simulation(){
    var f=[], i=0; [['Telly',5],['François',4],['Cissé',3]].forEach(function(x){ for(var k=0;k<x[1];k++) f.push({i:++i,type:'habitant',nom:'',photo:'',referent:x[0]}); });
    return Promise.resolve([{habitants:12,preteurs:37},f]);
  }
  var derniere=null, echec=false;
  // → {habitants, preteurs, brut, noms:{preteur:{n:{nom,photo}}}, habitants_liste:[…], etages:[{ref, personnes:[…]}]}
  function charger(){
    if(!SIMULATION&&!window.fetch) return Promise.reject(0);
    return (SIMULATION?simulation():Promise.all([rpcAvecReprise('compteur'),rpcAvecReprise('facade').catch(function(){return [];})])).then(function(r){
      var c=Array.isArray(r[0])?r[0][0]:r[0]; c=c||{};
      var noms={habitant:{},preteur:{}}, hab=[];
      (r[1]||[]).forEach(function(g){
        var pers={i:g.i,nom:g.nom||'',photo:g.photo||'',referent:g.referent||''};
        if(g.type==='habitant') hab.push(pers); else if(noms[g.type]) noms[g.type][g.i]=pers;
      });
      hab.sort(function(a,b){ return (a.i|0)-(b.i|0); });
      var etages=REFERENTS.map(function(R){ return {ref:R, personnes:hab.filter(function(h){ return referentDe(h.referent)===R; })}; });
      derniere={habitants:Math.min(50,Math.max(0,c.habitants|0)), preteurs:Math.min(120,Math.max(0,c.preteurs|0)), brut:c, noms:noms, hab:hab, etages:etages};
      echec=false; resumer(); rafraichirListes();
      return derniere;
    },function(e){ if(!derniere){ echec=true; rafraichirListes(); } throw e; });
  }
  function inscrire(donnees){
    return fetch(SB+'/rest/v1/inscriptions',{method:'POST',headers:{apikey:SBK,'Content-Type':'application/json',Prefer:'return=minimal'},body:JSON.stringify(donnees)})
      .then(function(r){ if(!r.ok)throw 0; });
  }
  // Réduit la photo à un carré de 320 px (JPEG), ce qui retire aussi les métadonnées. → Blob
  function reduire(fichier){
    return new Promise(function(ok,ko){
      var url=URL.createObjectURL(fichier), img=new Image();
      img.onload=function(){
        try{
          var C=320, c=document.createElement('canvas'); c.width=C; c.height=C;
          var s=Math.min(img.naturalWidth,img.naturalHeight), sx=(img.naturalWidth-s)/2, sy=(img.naturalHeight-s)/2;
          c.getContext('2d').drawImage(img,sx,sy,s,s,0,0,C,C);
          URL.revokeObjectURL(url);
          c.toBlob(function(b){ b?ok(b):ko(0); },'image/jpeg',.82);
        }catch(e){ ko(e); }
      };
      img.onerror=function(){ URL.revokeObjectURL(url); ko(0); };
      img.src=url;
    });
  }
  // Envoie la photo réduite dans le stockage « portraits ». → nom du fichier, ou null si ça échoue.
  function televerser(fichier){
    if(!fichier||!/^image\//.test(fichier.type)) return Promise.resolve(null);
    var nom=(window.crypto&&crypto.randomUUID?crypto.randomUUID():Date.now().toString(36)+'-'+Math.random().toString(36).slice(2,10))+'.jpg';
    return reduire(fichier).then(function(blob){
      return fetch(SB+'/storage/v1/object/portraits/'+nom,{method:'POST',headers:{apikey:SBK,Authorization:'Bearer '+SBK,'Content-Type':'image/jpeg','x-upsert':'false'},body:blob})
        .then(function(r){ return r.ok?nom:null; });
    }).catch(function(){ return null; });
  }
  // Charge les données, mais n'attend pas plus de DELAI : passé ce temps, surPlace(zéro) puis, si elles arrivent, tard(données).
  function chargerAvecDelai(aTemps,tard){
    var d=charger(), fini=false;
    var minuterie=new Promise(function(ok,ko){ setTimeout(function(){ ko('délai'); },DELAI); });
    var polices=document.fonts&&document.fonts.ready?Promise.race([document.fonts.ready,new Promise(function(r){ setTimeout(r,600); })]):Promise.resolve();
    Promise.race([d,minuterie]).then(function(x){ fini=true; polices.then(function(){ aTemps(x); }); },
      function(){ if(fini)return; fini=true; aTemps(null); d.then(function(x){ tard(x); },function(){}); });
  }

  /* ================= 2. Dessins ================= */
  function r(x,y,w,h,cls){ return '<rect x="'+x+'" y="'+y+'" width="'+w+'" height="'+h+'"'+(cls?' class="'+cls+'"':'')+'/>'; }
  // Remplace <div data-dessin="nom"> par le dessin (la div a déjà la même taille : rien ne bouge autour).
  function poser(nom,svg){ var p=document.querySelector('[data-dessin="'+nom+'"]'); if(!p)return null; p.insertAdjacentHTML('afterend',svg); var s=p.nextElementSibling; p.remove(); return s; }

  // La façade : viewBox 1200 × 740. Corniche, 5 étages × 10 fenêtres, cordon en pierre bleue,
  // rez-de-chaussée de 120 briques (3 trumeaux × 4 briques × 10 assises) percé de 2 portes, trottoir.
  var G={corniche:[8,36],etage0:40,hEtage:88,cordon:[480,522],rez:[522,716],assise:19.4,brique:60,trottoir:[716,740],colonne:240,cadre:16,linteau:534};
  function portesFacade(){ return [1,3].map(function(c){ return {x:c*G.colonne+G.cadre, y:G.linteau, w:G.colonne-2*G.cadre, h:G.rez[1]-G.linteau}; }); }
  function dessinFacade(){
    var W=1200, H=740, o=[], e, c, a, k;
    o.push('<svg class="dessin" viewBox="0 0 '+W+' '+H+'" role="img" aria-labelledby="facade-t facade-d" xmlns="http://www.w3.org/2000/svg">');
    o.push('<title id="facade-t">'+esc(T.facadeTitre)+'</title><desc id="facade-d">'+esc(T.facadeDesc)+'</desc>');
    o.push(r(0,G.corniche[1],W,G.cordon[0]-G.corniche[1],'enduit'));
    o.push(r(-4,G.corniche[0],W+8,18,'pierre'));
    o.push(r(0,G.corniche[0]+18,W,10,'mortier'));
    for(k=0;k<21;k++) o.push(r(10+k*58.5,G.corniche[0]+28,12,10,'pierre'));
    // fenêtres : étage 1 en bas, de gauche à droite (ordre de remplissage = compteur)
    var n=0;
    for(e=0;e<5;e++){
      var y0=G.etage0+(4-e)*G.hEtage;
      for(c=0;c<10;c++){
        var x=c*120+30, y=y0+14, w=60, h=60;
        o.push('<g class="f" data-i="'+(n++)+'">'+r(x-4,y-4,w+8,h+8,'pierre')+r(x,y,w,h,'v')+
          '<path class="ch" d="M'+x+' '+(y+18)+'H'+(x+w)+'M'+(x+w/2)+' '+(y+18)+'V'+(y+h)+'"/>'+r(x-8,y+h+4,w+16,6,'mortier')+'</g>');
      }
    }
    o.push(r(0,G.cordon[0],W,G.cordon[1]-G.cordon[0],'pierre'));
    o.push(r(0,G.rez[0],W,G.rez[1]-G.rez[0],'mortier'));
    o.push('<defs>'+[0,2,4].map(function(c){ return '<clipPath id="tr'+c+'">'+r(c*G.colonne,G.rez[0],G.colonne,G.rez[1]-G.rez[0])+'</clipPath>'; }).join('')+'</defs>');
    // briques : assise par assise depuis le bas, de gauche à droite ; dans une assise décalée, la paire de demi-briques
    // (une seule brique logique) vient en dernier
    var pieces=[], B=G.brique, A=G.assise, m=3;
    for(a=0;a<10;a++){
      var yb=G.rez[1]-(a+1)*A;
      [0,2,4].forEach(function(c){
        var px=c*G.colonne;
        if(a%2===0){ for(var q=0;q<4;q++) pieces.push([[px+q*B,yb,c]]); }
        else { for(var q2=0;q2<3;q2++) pieces.push([[px+B/2+q2*B,yb,c]]); pieces.push([[px-B/2,yb,c],[px+3.5*B,yb,c]]); }
      });
    }
    pieces.forEach(function(p,i){
      o.push('<g class="b" data-i="'+i+'" clip-path="url(#tr'+p[0][2]+')">'+p.map(function(q){ return r(q[0]+m/2,q[1]+m/2,B-m,A-m,''); }).join('')+'</g>');
    });
    portesFacade().forEach(function(p,i){
      o.push(r(p.x-G.cadre,G.rez[0],G.colonne,G.linteau-G.rez[0],'pierre'));
      o.push(r(p.x-G.cadre,G.rez[0],G.cadre,G.rez[1]-G.rez[0],'pierre'));
      o.push(r(p.x+p.w,G.rez[0],G.cadre,G.rez[1]-G.rez[0],'pierre'));
      o.push(r(p.x,p.y,p.w,p.h,i===0?'porte1':'porte2'));
    });
    o.push(r(0,G.trottoir[0],W,G.trottoir[1]-G.trottoir[0],'trottoir'));
    portesFacade().forEach(function(p){ o.push(r(p.x-G.cadre-6,G.trottoir[0],G.colonne+12,8,'pierre')); });
    o.push('</svg>');
    return o.join('');
  }

  /* ================= 3. Mouvement ================= */
  function allumer(els,n){ els.forEach(function(g,i){ g.classList.toggle('on',i<n); }); }
  /* La séquence d'ouverture. groupes : [{els:[<g>…], n:combien allumer, dec:40|25, plaque:<b>|null, base:0}].
     Chaque élément passe à l'état « on » en 220 ms (CSS), avec un décalage dec × rang (resserré si la séquence dépasse 2 s).
     La plaque gagne un chiffre à mi-transition de chaque élément. Une animation Web vide sert d'horloge commune.
     À la fin, l'état est exactement l'état statique. */
  function sequence(groupes,surFin){
    var racine=document.documentElement;
    function plaques(fin){ groupes.forEach(function(g){ if(g.plaque) g.plaque.textContent=fmt((g.base||0)+(fin?g.n:0)); }); }
    var total=groupes.reduce(function(s,g){ return s+g.n; },0);
    if(reduit||!total||!racine.animate){
      groupes.forEach(function(g){ allumer(g.els,g.n); }); plaques(true); racine.setAttribute('data-sequence','fini'); if(surFin)surFin(); return;
    }
    // largeur finale des chiffres, mesurée puis réservée : le texte de la plaque ne saute pas pendant le comptage
    plaques(true);
    var larg=groupes.map(function(g){ return g.plaque?g.plaque.getBoundingClientRect().width:0; });
    plaques(false);
    groupes.forEach(function(g,j){ if(g.plaque&&larg[j]){ g.plaque.classList.add('compte'); g.plaque.style.minWidth=larg[j]+'px'; } });
    var duree=0, premier=null;
    groupes.forEach(function(g){
      g.d=g.n>1?Math.min(g.dec,PLAFOND/(g.n-1)):0;
      for(var i=0;i<g.n;i++) tous('rect',g.els[i]).forEach(function(x){ x.style.transitionDelay=(i*g.d)+'ms'; if(!premier)premier=x; });
      if(g.n) duree=Math.max(duree,(g.n-1)*g.d);
    });
    duree+=TRANSITION;
    if(premier) getComputedStyle(premier).fill; // l'état 0 est calculé : les transitions partent bien de lui
    groupes.forEach(function(g){ allumer(g.els,g.n); });
    var horloge=racine.animate([],{duration:duree,fill:'both'});
    function combien(t,g){ return Math.max(0,Math.min(g.n,Math.floor((t-TRANSITION/2)/(g.d||1))+1)); }
    racine.setAttribute('data-sequence','joue');
    (function pas(){
      if(racine.getAttribute('data-sequence')!=='joue')return;
      var t=horloge.currentTime||0, reste=false;
      groupes.forEach(function(g){ var c=combien(t,g); if(g.plaque) g.plaque.textContent=fmt((g.base||0)+c); if(c<g.n)reste=true; });
      if(reste) requestAnimationFrame(pas);
    })();
    var anims=[horloge];
    groupes.forEach(function(g){ g.els.slice(0,g.n).forEach(function(el){ if(el.getAnimations) anims=anims.concat(el.getAnimations({subtree:true})); }); });
    Promise.all(anims.map(function(a){ return a.finished; })).then(fin,fin);
    setTimeout(fin,duree+400); // filet de sécurité (onglet en arrière-plan)
    function fin(){
      if(racine.getAttribute('data-sequence')==='fini')return;
      racine.setAttribute('data-sequence','fini');
      plaques(true); horloge.cancel();
      groupes.forEach(function(g){
        if(g.plaque){ g.plaque.classList.remove('compte'); g.plaque.style.minWidth=''; }
        g.els.forEach(function(el){ tous('rect',el).forEach(function(x){ x.style.transitionDelay=''; }); });
      });
      if(surFin)surFin();
    }
  }
  // Joue fn une seule fois quand la cible entre dans l'écran, ou si elle a déjà été dépassée (arrivée par une ancre plus bas).
  function observer(cible,fn,seuil){
    if(!('IntersectionObserver' in window)){ fn(); return; }
    var fait=false, io;
    function go(){ if(fait)return; fait=true; io.disconnect(); removeEventListener('scroll',verif); fn(); }
    function verif(){ if(cible.getBoundingClientRect().bottom<0) go(); }
    io=new IntersectionObserver(function(es){ if(es[0].isIntersecting) go(); },{threshold:seuil||.3});
    io.observe(cible); addEventListener('scroll',verif,{passive:true}); setTimeout(verif,400);
  }

  /* ================= 4. Textes de la page ================= */
  // Valeurs affichables à partir des données.
  function valeurs(d){
    var fen=Math.min(50,d.habitants|0), bri=Math.min(120,d.preteurs|0);
    return {fen:fen, bri:bri, ins:d.habitants|0, loyer:fen*300, somme:bri*1000, groupe:d.habitants|0, capacite:(d.habitants|0)*300};
  }
  /* Remplit la page :
     [data-compte="clé"]       reçoit le nombre (clés : fen, bri, ins, loyer, somme, groupe, capacite) ;
     [data-accord="clé"]       reçoit data-un si le nombre vaut 1, sinon data-plus (singulier / pluriel écrits dans la page) ;
     [data-seuil="assez"]      visible à partir de 3 promesses de prêt ; [data-seuil="amorce"] visible en dessous. */
  function remplir(d,sauf){
    var v=valeurs(d);
    tous('[data-compte]').forEach(function(e){ if(sauf&&sauf.indexOf(e)>=0)return; var c=e.getAttribute('data-compte'); if(c in v) e.textContent=fmt(v[c]); });
    tous('[data-accord]').forEach(function(e){ var c=e.getAttribute('data-accord'); if(!(c in v))return; var t=v[c]===1?e.getAttribute('data-un'):e.getAttribute('data-plus'); if(t!=null&&e.textContent!==t) e.textContent=t; });
    var assez=(d.preteurs|0)>=SEUIL;
    tous('[data-seuil="assez"]').forEach(function(e){ e.hidden=!assez; });
    tous('[data-seuil="amorce"]').forEach(function(e){ e.hidden=assez; });
  }
  // Résumé texte du bâtiment ([data-resume="fenetres briques"]) : lu une seule fois par les lecteurs d'écran (aria-live).
  function resumer(){
    if(!derniere)return;
    tous('[data-resume]').forEach(function(e){
      var parts=[]; (e.getAttribute('data-resume')||'').split(/\s+/).forEach(function(g){
        if(g==='fenetres') parts.push(T.resumeFen(derniere.habitants));
        if(g==='briques') parts.push(T.resumeBri(derniere.preteurs));
      });
      var t=parts.join(' · '); if(e.textContent!==t) e.textContent=t;
    });
  }

  /* ---------- Listes « Voir qui habite » / « Voir les prêteurs » ---------- */
  function remplirListe(panneau,genre){
    panneau.innerHTML='';
    if(!derniere){ panneau.appendChild(hel('p',null,echec?T.echec:T.chargement)); return; }
    var ul=hel('ul');
    function ligne(titre,noms,anonymes){
      var li=hel('li'); if(titre) li.appendChild(hel('b',null,titre+T.deuxPoints));
      var m=noms.slice(); if(anonymes) m.push(T.anonymes(anonymes));
      li.appendChild(document.createTextNode(m.length?m.join(T.virgule):T.vide)); ul.appendChild(li);
    }
    if(genre==='habitants'){
      derniere.etages.forEach(function(E){
        var noms=E.personnes.filter(function(p){ return p.nom; }).map(function(p){ return p.nom; });
        ligne(T.etageListe(E.ref.etage,E.ref.nom),noms,E.personnes.length-noms.length);
      });
    } else {
      var noms=[]; for(var n in derniere.noms.preteur){ if(derniere.noms.preteur[n].nom) noms.push(derniere.noms.preteur[n].nom); }
      ligne('',noms,Math.max(0,derniere.preteurs-noms.length));
    }
    panneau.appendChild(ul);
  }
  function rafraichirListes(){
    tous('[data-liste]').forEach(function(b){ var pn=$(b.getAttribute('aria-controls')); if(pn&&!pn.hidden) remplirListe(pn,b.getAttribute('data-liste')); });
  }
  function brancherListes(){
    tous('[data-liste]').forEach(function(b){
      if(b.getAttribute('data-branche'))return; b.setAttribute('data-branche','1');
      b.addEventListener('click',function(){
        var pn=$(b.getAttribute('aria-controls')); if(!pn)return;
        var ouvrir=b.getAttribute('aria-expanded')!=='true';
        b.setAttribute('aria-expanded',ouvrir?'true':'false'); pn.hidden=!ouvrir;
        if(ouvrir) remplirListe(pn,b.getAttribute('data-liste'));
      });
    });
  }
  // Remplissage par étage : <ul data-etages>, un item par personne référente avec sa barre.
  function etages(d){
    tous('[data-etages]').forEach(function(ul){
      ul.innerHTML=''; ul.hidden=false;
      var t=ul.getAttribute('aria-labelledby'); if(t&&$(t)) $(t).hidden=false;
      d.etages.forEach(function(E){
        var li=hel('li'), n=E.personnes.length;
        li.appendChild(hel('b',null,E.ref.nom)); var barre=hel('i'); barre.style.setProperty('--p',Math.min(100,n/PAR_ETAGE*100)+'%'); li.appendChild(barre);
        li.appendChild(hel('span',null,n+'/'+PAR_ETAGE)); li.setAttribute('aria-label',T.etagesAria(E.ref.etage,E.ref.nom,n,PAR_ETAGE));
        ul.appendChild(li);
      });
    });
  }
  // Sans données : pas de barres à zéro trompeuses (« Voir qui habite » dit que la liste n'a pas pu être chargée).
  function cacherEtages(){ tous('[data-etages]').forEach(function(ul){ ul.hidden=true; var t=ul.getAttribute('aria-labelledby'); if(t&&$(t)) $(t).hidden=true; }); }

  /* ---------- Bulle : clic à la souris ou au doigt sur une fenêtre ou une brique ----------
     Bonus visuel : les places ne sont pas atteignables au clavier ; la même information est donnée par le résumé
     et par les boutons « Voir qui habite » / « Voir les prêteurs ». */
  var bulle=null, ancre=null;
  function fermer(){ if(!bulle||bulle.hidden)return; bulle.hidden=true; if(ancre)ancre.classList.remove('ouverte'); ancre=null; }
  function placerBulle(){
    if(!ancre)return; var a=ancre.getBoundingClientRect(), b=bulle.getBoundingClientRect();
    var x=Math.max(8,Math.min(innerWidth-b.width-8,a.left+a.width/2-b.width/2)), y=a.top-b.height-10; if(y<8) y=a.bottom+10;
    bulle.style.left=x+'px'; bulle.style.top=y+'px';
  }
  function ouvrir(g,t){
    if(!bulle){ bulle=hel('div','bulle'); bulle.hidden=true; document.body.appendChild(bulle);
      document.addEventListener('click',function(e){ if(!bulle.hidden&&!bulle.contains(e.target)&&!(ancre&&ancre.contains(e.target))) fermer(); });
      document.addEventListener('keydown',function(e){ if(e.key==='Escape') fermer(); });
      addEventListener('scroll',function(){ if(!bulle.hidden) placerBulle(); },{passive:true});
      addEventListener('resize',function(){ if(!bulle.hidden) placerBulle(); }); }
    bulle.innerHTML='';
    if(t.photo){ var im=hel('img'); im.src=photoUrl(t.photo); im.alt=''; im.width=64; im.height=64; bulle.appendChild(im); }
    var d=hel('div'); d.appendChild(hel('b',null,t.titre)); d.appendChild(hel('span',null,t.texte));
    if(t.lien){ var a=hel('a',null,t.lien.texte); a.href=t.lien.href; d.appendChild(a); }
    bulle.appendChild(d);
    if(ancre)ancre.classList.remove('ouverte'); ancre=g; g.classList.add('ouverte'); bulle.hidden=false; placerBulle();
  }
  function texteFenetre(g,lien){
    var i=+g.getAttribute('data-i'), on=g.classList.contains('on'), p=on&&derniere&&derniere.hab[i]||{};
    if(!on) return {titre:T.fenetre(i+1),texte:T.libre,lien:lien?{href:lien,texte:T.lienFenetre}:null};
    return {titre:T.fenetre(i+1),texte:p.nom?T.yVivra(p.nom):T.anonymeHab,photo:p.photo};
  }
  function texteBrique(g,lien){
    var n=+g.getAttribute('data-i')+1, on=g.classList.contains('on'), p=on&&derniere&&derniere.noms.preteur[n]||{};
    if(!on) return {titre:T.brique(n),texte:T.aPoser,lien:lien?{href:lien,texte:T.lienBrique}:null};
    return {titre:T.brique(n),texte:p.nom?T.aPromis(p.nom):T.anonymePret,photo:p.photo};
  }
  // liens : {fenetre:'…', brique:'…'} — où mène le lien d'une place encore libre
  function brancherBulles(svg,liens){
    if(!svg)return;
    svg.addEventListener('click',function(e){
      var g=e.target.closest('.f,.b'); if(!g)return; e.stopPropagation();
      if(ancre===g){ fermer(); return; }
      ouvrir(g,g.classList.contains('f')?texteFenetre(g,liens.fenetre):texteBrique(g,liens.brique));
    });
  }

  /* ---------- Au chargement : tableaux qui défilent ---------- */
  function regionsDefilantes(){
    // un tableau plus large que l'écran défile : la région devient atteignable au clavier (WCAG 2.1.1)
    tous('.tablewrap').forEach(function(t){ if(t.scrollWidth>t.clientWidth+1) t.setAttribute('tabindex','0'); else t.removeAttribute('tabindex'); });
  }
  function communs(){
    brancherListes(); regionsDefilantes();
    if('ResizeObserver' in window){ var ro=new ResizeObserver(regionsDefilantes); tous('.tablewrap').forEach(function(t){ ro.observe(t); }); }
    else addEventListener('resize',regionsDefilantes);
  }

  /* ---------- Formulaires : messages, champs en erreur ---------- */
  function montrer(el){ el.classList.remove('visible'); void el.offsetWidth; el.classList.add('visible'); }
  /* Marque les champs en cause : aria-invalid + lien vers le message d'erreur (aria-describedby), le premier reçoit le focus.
     Un champ corrigé perd son marquage tout de suite ; le message reste jusqu'au prochain envoi. */
  function erreurs(f,ko){
    var idKo=ko.id;
    function sans(c){ return (c.getAttribute('aria-describedby')||'').split(' ').filter(function(x){ return x&&x!==idKo; }); }
    function lever(c){ c.removeAttribute('aria-invalid'); var d=sans(c); if(d.length) c.setAttribute('aria-describedby',d.join(' ')); else c.removeAttribute('aria-describedby'); var fs=c.closest('fieldset'); if(fs) fs.removeAttribute('data-invalide'); }
    function groupe(c){ return c.type==='radio'?tous('[name="'+c.name+'"]',f):[c]; }
    function rempli(c){ return c.type==='radio'?!!f[c.name].value:c.type==='checkbox'?c.checked:!!c.value.trim(); }
    tous('input,select',f).forEach(function(c){ ['input','change'].forEach(function(ev){ c.addEventListener(ev,function(){
      if(c.getAttribute('aria-invalid')&&rempli(c)) groupe(c).forEach(lever);
    }); }); });
    return {
      tout:function(){ tous('[aria-invalid]',f).forEach(lever); },
      marquer:function(texte,champs){
        ko.textContent=texte; montrer(ko);
        champs.forEach(function(c){ c.setAttribute('aria-invalid','true'); var d=sans(c); d.push(idKo); c.setAttribute('aria-describedby',d.join(' ')); var fs=c.closest('fieldset'); if(fs) fs.setAttribute('data-invalide',''); });
        if(champs[0]) champs[0].focus();
      }
    };
  }
  function apercuPhoto(f){
    var apercu=f.querySelector('.apercu');
    f.photo.addEventListener('change',function(){ var fi=f.photo.files&&f.photo.files[0]; if(fi&&/^image\//.test(fi.type)){ apercu.src=URL.createObjectURL(fi); apercu.hidden=false; } else { apercu.hidden=true; apercu.removeAttribute('src'); } });
    return apercu;
  }
  function succes(ok,glyphe,texte){ ok.textContent=''; var i=document.createElement('i'); i.className=glyphe; i.setAttribute('aria-hidden','true'); ok.appendChild(i); ok.appendChild(document.createTextNode(texte)); montrer(ok); }

  /* ================= 5. Les pages ================= */

  /* La façade des trois pages : dessin, bulles, plaque, séquence d'ouverture, remplissage par étage.
     liens : où mène le lien de la bulle d'une place encore libre ({fenetre:'…', brique:'…'}).
     → {afficher(d), fens, bris, pf, pb} : afficher(d) rejoue la séquence la première fois, pose l'état directement ensuite. */
  function facade(liens){
    var svg=poser('facade',dessinFacade());
    var fens=tous('.f',svg), bris=tous('.b',svg);
    brancherBulles(svg,liens);
    var pf=document.querySelector('[data-plaque="fen"]'), pb=document.querySelector('[data-plaque="bri"]');
    var joue=false;
    function afficher(d){
      remplir(d,[pf,pb]);
      if(d.etages) etages(d); else cacherEtages();
      var v=valeurs(d);
      if(joue){ allumer(fens,v.fen); allumer(bris,v.bri); pf.textContent=fmt(v.fen); pb.textContent=fmt(v.bri); return; }
      joue=true;
      sequence([{els:fens,n:v.fen,dec:DEC_FEN,plaque:pf},{els:bris,n:v.bri,dec:DEC_BRI,plaque:pb}]);
    }
    chargerAvecDelai(function(d){ afficher(d||{habitants:0,preteurs:0}); },afficher);
    return {afficher:afficher,fens:fens,bris:bris,pf:pf,pb:pb};
  }

  /* Entrée (index.html) : la façade, deux portes (une vers chaque page), les chiffres. */
  function entree(){
    communs();
    facade({fenetre:'habiter.html#inscrire',brique:'preter.html#appel'});
  }

  /* Habiter (habiter.html) : la façade (porte lumière = « Je m'inscris »), le formulaire d'inscription. */
  function habiter(){
    communs();
    var F=facade({fenetre:'#inscrire',brique:'preter.html#promesse'});

    // Inscription : une ligne « habitant » dans la table inscriptions.
    var f=$('fHabitant'); if(!f)return;
    var ok=f.querySelector('.ok'), ko=f.querySelector('.ko'), btn=f.querySelector('button[type=submit]');
    var libelle=btn.textContent, koHTML=ko.innerHTML, E=erreurs(f,ko), apercu=apercuPhoto(f);
    f.addEventListener('submit',function(ev){
      ev.preventDefault();
      E.tout(); ok.classList.remove('visible');
      if(f.site.value){ ok.textContent=T.merci; montrer(ok); return; }
      var nom=f.nom.value.trim(), contact=f.contact.value.trim(), telephone=f.telephone.value.trim(), referent=f.referent.value.trim(), affiche=f.affiche.value==='oui';
      if(!nom||!contact){ E.marquer(T.hNomContact,(!nom?[f.nom]:[]).concat(!contact?[f.contact]:[])); return; }
      if(!telephone){ E.marquer(T.hTelephone,[f.telephone]); return; }
      if(!f.affiche.value){ E.marquer(T.hAffiche,tous('[name=affiche]',f)); return; }
      if(referent.length<2){ E.marquer(T.hReferent,[f.referent]); return; }
      if(!f.consentement.checked){ E.marquer(T.hAccord,[f.consentement]); return; }
      btn.disabled=true; btn.textContent=T.envoi;
      var fichier=f.photo.files&&f.photo.files[0], photo=null, ratee=false;
      (affiche&&fichier?televerser(fichier):Promise.resolve(null))
      .then(function(p){ photo=p; ratee=!!(affiche&&fichier&&!p);
        return inscrire({type:'habitant',nom:nom,contact:contact,telephone:telephone,referent:referent,affiche:affiche,photo:photo}); })
      .then(function(){ return charger().catch(function(){ return null; }); })
      .then(function(d){
        ko.classList.remove('visible');
        // où la personne atterrit : sur l'étage de sa personne référente, à la k-ième place réunie
        var R=referentDe(referent), Et=d&&R?d.etages.filter(function(x){ return x.ref===R; })[0]:null, k=Et?Et.personnes.length:0, n=Et?fenetreDe(R,k):0;
        var suite=T.hSuite(affiche,photo,ratee), texte;
        if(!d) texte=T.hNote(nom);
        else if(n) texte=T.hFenetre(nom,R.etage,R.nom,n,suite);
        else texte=T.hAttente(nom,R?R.nom:referent,k,suite);
        succes(ok,'fenetre-msg',texte);
        if(d) F.afficher(d);
        f.reset(); apercu.hidden=true; btn.disabled=false; btn.textContent=libelle;
        ok.scrollIntoView({block:'nearest'});
      })
      .catch(function(){ btn.disabled=false; btn.textContent=libelle; ko.innerHTML=koHTML; montrer(ko); });
    });
  }

  /* Prêter (preter.html) : la façade (porte brique = « Devenir l'un des 120 »), le formulaire de promesse. */
  function preter(){
    communs();
    var F=facade({fenetre:'habiter.html#inscrire',brique:'#promesse'});

    // Promesse de prêt : une ligne « preteur » dans la table inscriptions.
    var f=$('fPromesse'); if(!f)return;
    var ok=f.querySelector('.ok'), ko=f.querySelector('.ko'), btn=f.querySelector('button[type=submit]');
    var libelle=btn.textContent, koHTML=ko.innerHTML, E=erreurs(f,ko), apercu=apercuPhoto(f);
    f.addEventListener('submit',function(ev){
      ev.preventDefault();
      E.tout(); ok.classList.remove('visible');
      if(f.site.value){ ok.textContent=T.merci; montrer(ok); return; }
      var nom=f.nom.value.trim(), contact=f.contact.value.trim(), affiche=f.affiche.value==='oui';
      if(!nom||!contact){ E.marquer(T.pNomContact,(!nom?[f.nom]:[]).concat(!contact?[f.contact]:[])); return; }
      if(!f.affiche.value){ E.marquer(T.pAffiche,tous('[name=affiche]',f)); return; }
      if(!f.consentement.checked){ E.marquer(T.pAccord,[f.consentement]); return; }
      btn.disabled=true; btn.textContent=T.envoi;
      var fichier=f.photo.files&&f.photo.files[0], photo=null, ratee=false;
      (affiche&&fichier?televerser(fichier):Promise.resolve(null))
      .then(function(p){ photo=p; ratee=!!(affiche&&fichier&&!p);
        return inscrire({type:'preteur',nom:nom,contact:contact,note:null,affiche:affiche,photo:photo}); })
      .then(function(){ return charger().catch(function(){ return null; }); })
      .then(function(d){
        ko.classList.remove('visible');
        var t=d?(d.brut.preteurs|0):null, texte;
        if(t===null) texte=T.pPosee(nom);
        else if(t<=120) texte=T.pNumero(nom,t,affiche,photo,ratee);
        else texte=T.pAuDela(nom,t);
        succes(ok,'brique-msg',texte);
        if(d){
          F.afficher(d); allumer(F.bris,Math.max(0,d.preteurs-1));
          // la nouvelle brique se pose quand la façade repasse à l'écran
          if(t<=120){ if(affiche) d.noms.preteur[t]={nom:nom,photo:photo||''};
            var g=F.bris[t-1]; if(g) observer(g,function(){ allumer(F.bris,d.preteurs); },.5); }
        }
        f.reset(); apercu.hidden=true; btn.disabled=false; btn.textContent=libelle;
        ok.scrollIntoView({block:'nearest'});
      })
      .catch(function(){ btn.disabled=false; btn.textContent=libelle; ko.innerHTML=koHTML; montrer(ko); });
    });
  }

  window.Batiment={entree:entree,habiter:habiter,preter:preter,
    // outils (pour une page future ou un test dans la console)
    charger:charger,inscrire:inscrire,televerser:televerser,TEXTES:TEXTES,REFERENTS:REFERENTS};
})();
