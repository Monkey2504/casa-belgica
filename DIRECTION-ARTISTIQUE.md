# Direction artistique — Sortir du squat / Casa Belgica

Document de référence interne, non publié sur le site (voir `.vercelignore`). Décrit l'identité
graphique telle qu'elle existe réellement dans `style.css` au moment de l'écriture — vérifié
fichier en main, pas supposé. Sert de repère pour toute veille ou modification future : avant de
changer une couleur, une taille ou une animation, vérifier ici ce qui est déjà en place et pourquoi.

## Intention

Le site doit ressembler au dossier imprimé qui circule en parallèle (vert profond, or), pas à un
gabarit « éditorial » générique. Il prouve au lieu d'affirmer : le bâtiment et le mur affichent des
chiffres réels (Supabase), jamais gonflés ni simulés. Le ton reste direct, sans jargon ni emoji, sans
mot d'accroche systématique. Écriture affiche : capitales, un mot « tagué » à la main dans les grands
titres, contrastée par un corps de texte sobre (Instrument Sans) qui, lui, ne hurle jamais.

## Typographie

Trois familles chargées, un seul rôle chacune :

- **Titres, chiffres, boutons, étiquettes** (`--disp`) : **Anton**, tout en capitales, une seule
  graisse (`font-synthesis-weight:none` pour ne pas la faire gras artificiellement). C'est la police
  d'affiche du site depuis la passe « luxe-street ». *Bricolage Grotesque reste chargé depuis Google
  Fonts dans le `<head>` de chaque page mais n'est plus utilisé nulle part : `--disp` est redéfini
  plus loin dans `style.css` (ligne ~488) et écrase la valeur initiale. C'est un lien de police mort
  qui coûte une requête réseau pour rien — à corriger un jour, séparément de ce document.*
- **Le mot tagué** (`.tag`, classe `--tag`) : **Sedgwick Ave Display**, cursive, couleur or, tourné
  -4° (`rotate(-4deg) translateY(.04em)`), utilisé une fois par grand titre (`<em class="tag">`).
  Ne s'applique pas à l'arabe (`html[lang="ar"] .tag` retombe sur la police du corps, sans rotation :
  Sedgwick Ave Display ne couvre pas l'arabe).
- **Corps de texte** (`--body`) : **Instrument Sans**.
- **Arabe** : `--disp` et `--body` valent tous deux **Cairo** (`html[lang="ar"]`). Cairo a de vraies
  graisses (400/600/800) : les titres passent en `font-weight:800` au lieu du `400` uppercase du
  reste du site, avec un `line-height` plus généreux (1.15–1.2 contre 0.9–1 en LTR), parce que
  l'écriture arabe supporte mal l'interlignage serré taillé pour des capitales latines.

Échelle (via `clamp()`, jamais de taille fixe pour un titre) :
- `h1` (hero habiter/prêter) : `clamp(2.9rem, 7vw, 5.6rem)`, line-height `.9–.95`.
- `.porte .grand` (entrée, les deux portes) : `clamp(3.2rem, 8.6vw, 7.2rem)`, la plus grande taille du
  site — l'entrée est une affiche, pas une page de contenu.
- `.manifeste .grand` : `clamp(2.6rem, 9vw, 7.4rem)`.
- `h2` : `clamp(1.8rem, 4vw, 2.9rem)`.
- Corps : `17px` fixe (pas de `clamp` — le texte courant ne doit pas rétrécir sur mobile).
- Chiffres qui comptent (`.num`, `.rouleau`, les `<b>` de stats) : toujours
  `font-variant-numeric:tabular-nums`, pour qu'un chiffre qui roule ne fasse pas sauter la largeur.

## Palette et tokens

Définis une fois dans `:root`, jamais de couleur en dur dans une règle de composant :

```
--vert-nuit:#13251A   fond des sections fortes (héros, pied, appel, porte « construire »)
--vert:#1F4A35        accent secondaire, fond de carte, porte « habiter »
--vert-clair:#2A5E45  survol / variante claire du vert
--or:#E3C362          accent principal : CTA, chiffres qui comptent, fenêtres/briques actives
--or-sombre:#7C6326   liens sur fond clair, texte sur fond or pâle
--or-pale:#F1DFA4     survol des boutons or
--creme:#F3F1EA       fond des pages de contenu
--creme-2:#EAE7DD     fond des barres de comparaison
--blanc:#FBFAF6
--encre:#17211B       texte principal sur fond clair
--mut:#5E6B62         texte secondaire sur fond clair
--ligne / --ligne-forte  filets, réservés aux tableaux et séparations de section
--sur-vert:#EFEADB    texte sur fond vert nuit / vert
--sur-vert-mut:#A9B5AC  texte secondaire sur fond vert nuit / vert
```

Règle héritée de l'analyse graphique d'origine : le rouge brique et le bleu de l'ancienne version
n'existent plus. Deux fonds seulement portent le texte clair (vert nuit, vert) ; le crème porte
toujours le texte encre. L'or ne sert jamais de fond de texte long — seulement accents, boutons,
pastilles.

## Grille et espacements

- Largeur de page : `--w:1120px`, marge latérale `--gut:clamp(18px,4vw,40px)`.
- Deux colonnes (`.two`, `.heroRow`, `.reste`) passent à une colonne sous `900px` (héros) ou `860px`
  (contenu).
- Points de rupture réellement utilisés, du plus étroit au plus large : `400 · 420 · 480 · 600 · 720 ·
  760 · 820 · 860 · 900px`. Pas de point de rupture au-delà de 900px : au-delà, tout est plafonné par
  `--w`.
- `400px` est le seuil « rien ne dépasse » : logo, boutons, listes de sorties et `.keys` y reçoivent
  des ajustements spécifiques pour ne jamais forcer de défilement horizontal.

## Composants

- **Boutons** `.btn` : trois variantes (`or`, `ghost`, `vert`), hauteur minimale 48px (cible tactile),
  transition sur fond/bord/transform, jamais sur la position.
- **Portes de l'entrée** `.porte` : pleine hauteur, texte centré à toutes les tailles, flèche qui
  glisse au survol (pointeur fin uniquement, `@media(hover:hover) and (pointer:fine)` — pas d'état
  collé au doigt sur tactile).
- **Cartes chiffrées** `.fait`, `.stats`, `.keys` : fond vert ou crème, chiffre en Anton, jamais de
  cadre noir autour (leçon de l'analyse graphique : « quand tout est encadré, plus rien n'est mis en
  avant »).
- **Comparaison à barres** `.reste` : loyer vs reste-à-vivre à l'échelle réelle (`flex:725`, `flex:615`
  etc.), pas un chiffre écrit à côté d'un autre — la barre montre la proportion.
- **Tableaux** : seul composant qui garde des filets ; jamais de fond alterné à faible contraste.
- **Accordéon** `.faq details/summary` : cible de clic 36px, icône ronde qui pivote 45° à l'ouverture,
  ouverture animée uniquement si le mouvement n'est pas réduit.
- **Formulaires** `.form` : fond sombre, champs `#0E1D14`, hauteur minimale 48px, choix oui/non en
  boutons radio explicites plutôt qu'une case à cocher qu'on oublie, aperçu de photo, honeypot
  invisible (`.hp`) hors écran pour les robots.
- **Bulle / infobulle** `.bulle` : une seule instance par page, positionnée dynamiquement (au-dessus
  ou en dessous selon la place), flèche qui pointe vers l'ancre cliquée.
- **Chiffres à rouleaux** `.rouleau` : chaque chiffre est une colonne qui glisse verticalement vers sa
  valeur — jamais un simple changement de texte pour un compteur.
- **Bandeau défilant** `.bandeau` : piste dupliquée en boucle infinie (`translateX(-50%)`), miroir en
  arabe (`defile-rtl`, `translateX(50%)`).

## Motion

Principe unique : **tout mouvement non essentiel est gated par
`@media(prefers-reduced-motion:no-preference)`**. Sous réduction de mouvement, l'état final s'affiche
directement, sans étape intermédiaire — jamais un élément qui reste cassé ou invisible faute
d'animation (c'est exactement le type de bug déjà rencontré une fois sur ce site : un `getElementById`
qui échoue silencieusement avant que l'état final ne se pose).

- **Entrées** : `naitre` (apparition + léger scale), `arriver` (fondu + translation 8px, décalé de
  60–200ms entre les deux portes de l'entrée), `glisser` (message de formulaire), `ouvrir` (accordéon),
  `poser` (brique qui se pose).
- **Ambiance** : `veille`, une lueur faible et dispersée sur les fenêtres encore libres, avec un délai
  par fenêtre dérivé de son numéro (`(n*173)%6000` ms) pour qu'aucune ne clignote en même temps.
- **Allumage dispersé** : quand plusieurs fenêtres/briques s'allument d'un coup (chargement des
  données), l'ordre est mélangé par `(n*37)%101` puis posé à 60ms d'écart — jamais un balayage
  linéaire qui trahirait l'ordre d'inscription réel.
- **Défilement automatique** (`.bandeau`) : seule animation *infinie* du site ; elle aussi disparaît
  entièrement sous réduction de mouvement (pas de version ralentie, elle est juste absente).
- Toutes les transitions de couleur/bordure restent actives sous réduction de mouvement (elles ne
  bougent rien, elles changent un état) ; seules les transitions de position/opacity/transform sont
  coupées.

## Illustrations : le bâtiment et le mur

Les deux visuels sont générés en JS (`batiment.js`, fonction `facade()`), jamais en image statique :
ce sont des données réelles rendues en SVG, pas une illustration.

- **Le bâtiment** : 5 étages × 10 fenêtres, numérotées du rez-de-chaussée vers le haut. Une personne
  référente par étage (Telly, François, Cissé, Delya, Ibrahim), sa fenêtre marquée d'un cadre blanc
  distinct. États d'une fenêtre : éteinte (avec la veille ambiante), allumée (or, lueur), allumée avec
  photo. Chaque fenêtre est cliquable et clavier-accessible (`role="button"`, `tabindex`).
- **Le mur** : 120 briques en 8 rangées de 15, appareil à joints décalés (les rangées paires ont deux
  demi-briques aux extrémités qui forment une seule promesse coupée en deux — pas une brique en trop).
  Non posées : pointillé or transparent. Posées : or plein. Une brique qui vient d'être promise
  s'allume une fois avec une lueur, quand elle entre dans l'écran (pas au chargement, pour ne pas
  noyer l'effet).
- Les deux structures partagent le même moteur d'allumage dispersé et la même bulle d'information au
  clic — un seul composant, deux mises en page.

## Arabe (RTL)

Le flux (flex, grid, marges logiques) se retourne seul avec `dir="rtl"` ; on ne corrige que les
propriétés physiques, listées explicitement dans `style.css` sous le commentaire dédié :

- Navigation, sélecteur de langue, marges des liens : `right`/`left` et `margin` inversés.
- Jauge de progression (`.jauge i`) : `transform-origin:right` au lieu de `left`.
- Listes de sources, légendes : `padding`/`margin` inversés.
- Bandeau défilant : anime vers la droite (`defile-rtl`) au lieu de la gauche.
- Un fragment cité en français ou en anglais à l'intérieur d'une page arabe reste isolé en
  `direction:ltr` (`unicode-bidi:isolate`) — un numéro de téléphone ou un mot anglais ne doit jamais
  s'inverser.
- Le mot « tagué » (`.tag`) perd sa police cursive et sa rotation en arabe : Sedgwick Ave Display ne
  couvre pas l'arabe, mieux vaut un mot normal que des glyphes de substitution.

Ne jamais dupliquer une règle physique dans une page arabe individuelle : tout passe par
`[dir="rtl"]` ou `html[lang="ar"]` dans `style.css`, pour que les cinq langues restent un seul système.
