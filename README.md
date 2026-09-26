# Casa Belgica — Sortir du squat

Site statique de la campagne Casa Belgica : programme de logement de transition en création, porté par Ballal ASBL (Molenbeek). Deux chemins : s'inscrire pour y vivre, ou prêter pour le construire.

- `index.html` — page d'entrée (français), choix entre les deux chemins
- `habiter.html` — inscription des futurs habitants
- `preter.html` — inscription des prêteurs citoyens (0 %, 1 000 € la brique)
- `en/`, `de/`, `nl/`, `ar/` — mêmes trois pages, traduites (l'arabe en RTL)
- `batiment.js` — logique partagée : façade SVG (fenêtres/briques), chiffres à rouleaux, appels Supabase
- `style.css` — feuille de style commune aux 5 langues
- `fr.html`, `en.html` — anciennes URLs, redirigent vers `/` et `/en/`
- `ANALYSE-GRAPHIQUE.md` — analyse graphique du site précédent et choix de cette version

Site statique sans build : à déposer tel quel sur Vercel (déploiement automatique depuis `main`), Netlify ou GitHub Pages. Polices chargées depuis Google Fonts (Bricolage Grotesque, Instrument Sans). Les inscriptions et les compteurs passent par Supabase (clé publique dans `batiment.js`, jamais la clé de service).

Palette : vert nuit `#13251A`, vert `#1F4A35`, or `#E3C362`, crème `#F3F1EA` — la même que le dossier imprimé.
