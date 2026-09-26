# Design Review: Sortir du squat / Casa Belgica
**Date**: 2026-09-26
**URL**: http://127.0.0.1:8811/ (dépôt local, HEAD `01f0f19`) — pages `index.html`, `habiter.html`, `preter.html`, `ar/index.html`
**Outil**: Playwright + Chromium, captures desktop (1440×900) et mobile (390×844)

## Overall Impression
Système visuel cohérent et manifestement soigné (palette, boutons, cartes, formulaires identiques d'une page à l'autre) — mais un seul choix typographique (titres géants en capitales Anton) casse net sur la page `habiter.html`, où un titre plus long que sur les autres pages produit un empilement de 6 lignes qui écrase la mise en page.

## Findings

### High
- **Titre qui ne dégrade pas avec la longueur du texte** à `habiter.html`, desktop/tablette (900–1440px) — Le titre H1 utilise `clamp(2.9rem,7vw,5.6rem)` en capitales Anton, calé sur la largeur de la fenêtre plutôt que sur la largeur réelle de sa colonne (~50 % de la page dans la grille à deux colonnes). Sur `index.html`, le titre fait 4-5 mots et tient en 3 lignes courtes — l'effet est réussi. Sur `habiter.html`, le titre fait 10 mots (« Une chambre pour toi, un toit à Bruxelles, à 300 €/mois. ») et le même traitement produit 6 lignes géantes qui repoussent le texte, les boutons et l'illustration du bâtiment loin sous la ligne de flottaison → Réserver le très grand corps de titre aux formulations courtes (image de marque), et redescendre l'échelle (`clamp` avec un plafond plus bas, ou `font-size-adjust` selon le nombre de mots) pour les titres longs comme celui de `habiter.html`.

### Medium
- **Déséquilibre de hiérarchie visuelle** à `habiter.html`, desktop — Conséquence directe du point précédent : à côté d'un titre qui occupe toute la hauteur du viewport, le petit bâtiment SVG (fenêtres/briques) se retrouve minuscule et isolé, avec un grand vide à sa droite qui n'a pas l'air voulu → une fois le titre corrigé, revérifier que le bâtiment garde une taille comparable à celle qu'il a sur `preter.html`, où l'équilibre titre/illustration fonctionne bien.
- **Même illustration de mur répétée deux fois sur `preter.html`** — Le mur de 120 briques pointillées apparaît identique dans le hero et à nouveau dans la section « Ce qu'on vous demande » quelques centaines de pixels plus bas, sans variation (ni recadrage, ni changement d'échelle) → soit retirer la seconde occurrence, soit la traiter différemment (zoom sur une portion, ou remplacer par le rouleau de chiffres seul) pour éviter l'effet de redite.
- **Mur de briques peu lisible en tant que « mur »** à l'état actuel (0 promesse) — Sur toutes les pages, le bloc de 120 briques en pointillé se lit surtout comme un rectangle texturé uniforme à taille d'écran normale ; on distingue mal les briques individuelles tant qu'aucune n'est allumée. C'est le même constat que faisait déjà `ANALYSE-GRAPHIQUE.md` sur l'ancienne version du site pour un problème différent (mur vide) — ici la mécanique (pointillé → plein à l'inscription) est la bonne idée, mais à zéro inscription le rendu reste proche du problème d'origine → grossir légèrement le pointillé ou augmenter le contraste du tracé pour que le mur se lise comme mur même à zéro.

### Low
- **Highlight derrière « 120 »** dans le titre de `preter.html` — Le fond doré translucide sous le chiffre (effet « stabilo ») n'est pas parfaitement centré verticalement sur les caractères, ce qui peut se lire comme un artefact de rendu au premier regard plutôt qu'un effet voulu → ajuster le `background` du `mark` de quelques pixels.
- **Espacement du bandeau défilant** (`.bandeau`) — les puces séparatrices sont régulières mais le contraste entre le texte gras et le fond or est très proche en luminosité par endroits selon la police système de secours si Anton tarde à charger (`font-display: swap` non vérifié ici) — à surveiller sur connexion lente, pas reproduit dans cet audit.

## What Looks Good
- **Cohérence des composants** : un seul style de bouton primaire (or plein) et un seul style secondaire (contour) réutilisés à l'identique sur les 3 pages ; cartes, champs de formulaire, badges numérotés tous alignés sur la même charte.
- **Graphiques de données proportionnels** : la barre « reste à vivre » (615 € / 1 040 €) sur `habiter.html` est à l'échelle réelle, pas juste deux nombres écrits — exactement la recommandation que se faisait le projet dans son propre audit précédent, bien appliquée ici.
- **Version arabe (RTL)** : mise en miroir complète et propre (navigation, flèches, alignement du texte), police Cairo en graisse plus lourde qui compense l'absence d'Anton en arabe — aucun bug de débordement ou de sens de lecture constaté.
- **Rythme de section** : alternance de fonds (vert nuit / crème / vert nuit rayé) qui découpe clairement les zones de la page sans avoir besoin de filets partout.

## Top 3 Fixes
1. Revoir l'échelle du titre H1 de `habiter.html` pour qu'il ne dépasse pas 3-4 lignes sur desktop/tablette — c'est le problème qui dégrade le plus visiblement la page.
2. Rééquilibrer la taille du bâtiment SVG par rapport au titre une fois celui-ci raccourci visuellement.
3. Différencier ou supprimer la répétition du mur de briques sur `preter.html`.
