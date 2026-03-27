// Métadonnées éditoriales et notations

const CUSTOM_META={
  // ── NÉBULEUSES D'ÉMISSION ─────────────────────────────────────────
  "M42":    {name:"M42 — Nébuleuse d'Orion",       filter:"lextreme",emission:true, desc:"La plus brillante nébuleuse d'émission boréale.",      notes:"Hiver. Descend vers SO en soirée. Attention surexposition Trapèze.", rating:{stars:5,tag:"IDÉAL",   comp:"M43",      reason:"M42+M43+Running Man — trio iconique dans 1.5°"}},
  "M43":    {name:"M43 — De Mairan",               filter:"lextreme",emission:true, desc:"Extension de M42 séparée par une bande sombre.",      notes:"Même champ que M42.",                                               rating:{stars:5,tag:"IDÉAL",   comp:"M42",      reason:"Extension M42 — inséparable du trio Orion"}},
  "M78":    {name:"M78 — Nébuleuse réflexion",     filter:"rgb",     emission:false,desc:"Nébuleuse par réflexion dans Orion.",                  notes:"Hiver. RGB Ultra pour la teinte bleue.",                            rating:{stars:3,tag:"MOYEN",   comp:null,       reason:"8' nébuleuse réflexion — contexte stellaire riche"}},
  "M8":     {name:"M8 — Lagune",                   filter:"lextreme",emission:true, desc:"Grande nébuleuse dans le Sagittaire.",                 notes:"Cible d'été. Très basse depuis cet hémisphère nord.",                     rating:{stars:4,tag:"BON",    comp:null,       reason:"Lagon 90'×40' — nébuleuse + amas"}},
  "M17":    {name:"M17 — Oméga",                   filter:"lextreme",emission:true, desc:"Nébuleuse d'émission brillante dans le Sagittaire.",   notes:"Cible d'été. Basse depuis cet hémisphère nord.",                          rating:{stars:0,tag:"—",      comp:null,       reason:null}},
  "M20":    {name:"M20 — Trifide",                 filter:"lextreme",emission:true, desc:"Nébuleuse émission + réflexion + absorption.",         notes:"Cible d'été. Très basse.",                                         rating:{stars:0,tag:"—",      comp:null,       reason:null}},
  "NGC2237":{name:"Rosette — NGC 2237",            filter:"lextreme",emission:true, desc:"Immense anneau Ha de ~1.3° dans la Licorne.",          notes:"Hiver. CIBLE PHARE ! Grand champ idéal. L-eXtreme.",               rating:{stars:5,tag:"IDÉAL",   comp:"NGC2244",  reason:"Rosette 1.3° — remplit parfaitement le champ"}},
  "IC434":  {name:"IC 434 — Horsehead",            filter:"lextreme",emission:true, desc:"Nébuleuse sombre iconique en absorption devant fond Ha.",notes:"Hiver. L-eXtreme obligatoire. Même champ que Flame.",            rating:{stars:5,tag:"IDÉAL",   comp:"NGC2024",  reason:"Tête de Cheval + Flamme — même champ iconique"}},
  "NGC2024":{name:"Flame — NGC 2024",              filter:"lextreme",emission:true, desc:"Nébuleuse d'émission brillante près d'Alnitak.",       notes:"Hiver. L-eXtreme. Même champ que Horsehead !",                    rating:{stars:5,tag:"IDÉAL",   comp:"IC434",    reason:"Flamme + Tête de Cheval — combo parfait dans 1°"}},
  "NGC2174":{name:"NGC 2174 — Monkey Head",        filter:"lextreme",emission:true, desc:"Nébuleuse Ha dans Orion/Gémeaux.",                     notes:"Hiver. L-eXtreme.",                                                rating:{stars:4,tag:"BON",    comp:null,       reason:"Monkey Head 40' — Ha spectaculaire"}},
  "IC2177": {name:"IC 2177 — Mouette",             filter:"lextreme",emission:true, desc:"Immense nébuleuse Ha entre Monoceros et Canis Major.", notes:"Hiver. Grand champ RedCat idéal. L-eXtreme.",                     rating:{stars:5,tag:"IDÉAL",   comp:"Sh2-296",  reason:"Mouette 2° + Est — panorama Ha parfait"}},
  "NGC2359":{name:"NGC 2359 — Casque de Thor",     filter:"lextreme",emission:true, desc:"Nébuleuse Wolf-Rayet Ha+OIII magnifique.",             notes:"Hiver. Assez basse. L-eXtreme.",                                   rating:{stars:3,tag:"MOYEN",   comp:null,       reason:"Casque Thor 8' — Ha spectaculaire mais petit"}},
  "IC443":  {name:"IC 443 — Méduse",               filter:"lextreme",emission:true, desc:"Rémanent de supernova dans Gémeaux. Ha+OIII.",         notes:"Hiver. L-eXtreme.",                                                rating:{stars:0,tag:"—",      comp:null,       reason:null}},
  "IC410":  {name:"IC 410 — Têtards",              filter:"lextreme",emission:true, desc:"Nébuleuse Ha avec deux protubérances en têtards.",     notes:"Hiver. L-eXtreme.",                                                rating:{stars:4,tag:"BON",    comp:null,       reason:"Têtards 40' — Ha spectaculaire, amas au centre"}},
  "NGC1499":{name:"NGC 1499 — Californie",         filter:"lextreme",emission:true, desc:"Immense nébuleuse Ha dans Persée. 2.5° de long.",      notes:"Automne/hiver. Grand champ parfait. L-eXtreme.",                   rating:{stars:5,tag:"IDÉAL",   comp:null,       reason:"Californie 2.5° — remplit le champ en longueur"}},
  "IC1805": {name:"IC 1805 — Coeur",               filter:"lextreme",emission:true, desc:"Immense nébuleuse Ha dans Cassiopée.",                 notes:"Automne/hiver. Circumpolaire. L-eXtreme.",                         rating:{stars:4,tag:"BON",    comp:"IC1848",   reason:"Cœur — mosaïque avec Âme en 2 panneaux"}},
  "IC1848": {name:"IC 1848 — Âme",                 filter:"lextreme",emission:true, desc:"Duo Heart & Soul avec IC1805.",                        notes:"Automne/hiver. Circumpolaire. L-eXtreme.",                         rating:{stars:4,tag:"BON",    comp:"IC1805",   reason:"Âme — mosaïque avec Cœur en 2 panneaux"}},
  "NGC281": {name:"NGC 281 — PacMan",              filter:"lextreme",emission:true, desc:"Nébuleuse Ha dans Cassiopée.",                         notes:"Automne. Circumpolaire. L-eXtreme.",                               rating:{stars:4,tag:"BON",    comp:null,       reason:"NGC281 PacMan 35' — Ha vif, très photogénique"}},
  "NGC7635":{name:"NGC 7635 — Bulle",              filter:"lextreme",emission:true, desc:"Nébuleuse sphérique Wolf-Rayet.",                      notes:"Automne. Circumpolaire. L-eXtreme.",                               rating:{stars:4,tag:"BON",    comp:"M52",      reason:"Bubble NGC7635 + M52 — duo Ha classique"}},
  "IC1396": {name:"IC 1396 — Trompe Éléphant",     filter:"lextreme",emission:true, desc:"Immense nébuleuse Ha avec trompe sombre dans Céphée.", notes:"Automne. Grand champ parfait. L-eXtreme.",                         rating:{stars:5,tag:"IDÉAL",   comp:null,       reason:"Trompe Éléphant 2.5° — grand champ parfait"}},
  "NGC7000":{name:"NGC 7000 — Amérique du Nord",   filter:"lextreme",emission:true, desc:"Immense nébuleuse Ha dans le Cygne. Grand champ idéal.",notes:"Été. L-eXtreme.",                                                 rating:{stars:5,tag:"IDÉAL",   comp:null,       reason:"Amérique du Nord 2° — grand champ parfait"}},
  "NGC6992":{name:"NGC 6992 — Voile du Cygne",     filter:"lextreme",emission:true, desc:"Rémanent supernova. Filaments Ha+OIII très fins.",     notes:"Été. L-eXtreme. Grand champ idéal.",                               rating:{stars:5,tag:"IDÉAL",   comp:null,       reason:"Voile du Cygne E — filaments sur 1°, splendide"}},
  "NGC6888":{name:"NGC 6888 — Croissant",          filter:"lextreme",emission:true, desc:"Nébuleuse Wolf-Rayet Ha+OIII.",                        notes:"Été. L-eXtreme.",                                                  rating:{stars:4,tag:"BON",    comp:null,       reason:"Croissant — Ha+OIII intense, bien cadré"}},
  "NGC1977":{name:"NGC 1977 — Running Man",        filter:"lextreme",emission:true, desc:"Nébuleuse de réflexion/émission près de M42.",         notes:"Hiver. Même champ que M42. L-eXtreme.",                            rating:{stars:5,tag:"IDÉAL",   comp:"M42,M43",  reason:"Running Man + M42 — OIII spectaculaire"}},
  // ── SNR ──────────────────────────────────────────────────────────
  "M1":     {name:"M1 — Crabe",                    filter:"lextreme",emission:true, desc:"Rémanent de supernova de 1054. Ha+OIII.",              notes:"Hiver. L-eXtreme pour les filaments.",                             rating:{stars:2,tag:"PETIT",   comp:null,       reason:"Crabe 7' — trop petit pour grand champ"}},
  // ── NÉBULEUSES PLANÉTAIRES ────────────────────────────────────────
  "M27":    {name:"M27 — Haltère",                 filter:"lextreme",emission:true, desc:"Plus grande nébuleuse planétaire visible. OIII.",      notes:"Été. L-eXtreme.",                                                  rating:{stars:2,tag:"PETIT",   comp:null,       reason:"Haltères 8' — mieux à plus longue focale"}},
  "M57":    {name:"M57 — Anneau",                  filter:"lextreme",emission:true, desc:"Nébuleuse planétaire en anneau. OIII.",                notes:"Été. Petite (1.4') mais bien résolue à 450mm.",                    rating:{stars:1,tag:"MINUSCULE",comp:null,       reason:"Anneau 1' — focale courte non adaptée"}},
  "M97":    {name:"M97 — Chouette",                filter:"lextreme",emission:true, desc:"Nébuleuse planétaire OIII. Yeux de la chouette.",      notes:"Circumpolaire ! CIBLE PHARE avec M108. L-eXtreme.",               rating:{stars:4,tag:"BON",    comp:"M108",     reason:"Chouette + M108 galaxy — duo dans 30' de champ"}},
  "NGC2392":{name:"NGC 2392 — Esquimau",           filter:"lextreme",emission:true, desc:"Nébuleuse planétaire avec structure interne complexe.",notes:"Hiver. L-eXtreme.",                                                rating:{stars:1,tag:"MINUSCULE",comp:null,       reason:"Eskimo 47'' — beaucoup trop petit"}},
  "NGC1514":{name:"NGC 1514 — Crystal Ball",       filter:"lextreme",emission:true, desc:"Nébuleuse planétaire dans le Taureau.",                notes:"Automne/hiver. L-eXtreme.",                                        rating:{stars:2,tag:"PETIT",   comp:null,       reason:"2' planétaire — trop petit"}},
  // ── GALAXIES ─────────────────────────────────────────────────────
  "M31":    {name:"M31 — Andromède",               filter:"rgb",     emission:false,desc:"La grande spirale voisine à 2.5 M années-lumière.",    notes:"Automne. Trop grande seule. Avec M32 et M110.",                    rating:{stars:4,tag:"BON",    comp:"M32,M110", reason:"Andromède centre + satellites — composition riche"}},
  "M33":    {name:"M33 — Triangle",                filter:"rgb",     emission:false,desc:"Galaxie spirale du groupe local.",                     notes:"Automne. Surface de brillance faible.",                             rating:{stars:4,tag:"BON",    comp:null,       reason:"Triangle 70'×45' — régions HII visibles en Ha"}},
  "M51":    {name:"M51 — Tourbillon",              filter:"rgb",     emission:false,desc:"Spirale en interaction avec NGC 5195.",                notes:"Printemps/été. Fin de nuit NE. Superbe.",                           rating:{stars:4,tag:"BON",    comp:null,       reason:"Tourbillon + NGC5195 — icône astrophoto"}},
  "M63":    {name:"M63 — Tournesol",               filter:"rgb",     emission:false,desc:"Spirale avec bras bien définis.",                     notes:"Printemps. NE en fin de nuit.",                                    rating:{stars:3,tag:"MOYEN",   comp:null,       reason:"Tournesol 13' — spirale serrée, correct"}},
  "M64":    {name:"M64 — Oeil Noir",               filter:"rgb",     emission:false,desc:"Galaxie avec anneau de poussière sombre.",             notes:"Printemps.",                                                       rating:{stars:2,tag:"PETIT",   comp:null,       reason:"Oeil Noir 10' — trop petit"}},
  "M65":    {name:"M65 — Leo Triplet",             filter:"rgb",     emission:false,desc:"Trio M65+M66+NGC3628. 3 galaxies dans le champ !",    notes:"Printemps. CIBLE PHARE !",                                          rating:{stars:4,tag:"BON",    comp:"M66,NGC3628",reason:"Leo Triplet — 3 galaxies dans 1.5°"}},
  "M66":    {name:"M66 — Leo Triplet",             filter:"rgb",     emission:false,desc:"Compagnon de M65.",                                   notes:"Même champ que M65.",                                              rating:{stars:4,tag:"BON",    comp:"M65,NGC3628",reason:"Leo Triplet — 3 galaxies dans 1.5°"}},
  "M74":    {name:"M74 — Fantôme",                 filter:"rgb",     emission:false,desc:"Spirale de face. Belle structure.",                   notes:"Automne.",                                                         rating:{stars:0,tag:"—",      comp:null,       reason:null}},
  "M81":    {name:"M81 — Bode",                    filter:"rgb",     emission:false,desc:"Spirale brillante circumpolaire avec M82.",            notes:"Circumpolaire. CIBLE PHARE !",                                     rating:{stars:4,tag:"BON",    comp:"M82",      reason:"Bode + Cigare — 37' séparation, duo classique"}},
  "M82":    {name:"M82 — Cigare",                  filter:"lextreme",emission:true, desc:"Galaxy starburst avec jets Ha impressionnants.",       notes:"Circumpolaire. L-eXtreme pour les jets.",                          rating:{stars:4,tag:"BON",    comp:"M81",      reason:"Cigare + Bode — filaments Ha spectaculaires"}},
  "M101":   {name:"M101 — Moulin à Vent",          filter:"rgb",     emission:false,desc:"Grande spirale de face dans la Grande Ourse.",        notes:"Circumpolaire. Printemps/été.",                                     rating:{stars:3,tag:"MOYEN",   comp:null,       reason:"Moulin 30' — remplissage moyen pour 3° de champ"}},
  "M104":   {name:"M104 — Sombrero",               filter:"rgb",     emission:false,desc:"Galaxie vue par la tranche avec bande sombre.",       notes:"Printemps. Basse sur horizon.",                                    rating:{stars:0,tag:"—",      comp:null,       reason:null}},
  "M106":   {name:"M106 — Spirale Seyfert",        filter:"lextreme",emission:true, desc:"Spirale Seyfert avec jets Ha. L-eXtreme révèle la structure.",notes:"Printemps. Accessible NE.",                              rating:{stars:3,tag:"MOYEN",   comp:null,       reason:"Spirale 19' — halos Ha visibles"}},
  "M108":   {name:"M108 + M97",                    filter:"rgb",     emission:false,desc:"Galaxie spirale compagnon de M97.",                   notes:"Circumpolaire. CIBLE PHARE avec M97 !",                            rating:{stars:4,tag:"BON",    comp:"M97",      reason:"Galaxie + M97 planétaire — composition unique"}},
  "M109":   {name:"M109 — Barrée",                 filter:"rgb",     emission:false,desc:"Spirale barrée dans la Grande Ourse.",                notes:"Circumpolaire. Printemps.",                                        rating:{stars:2,tag:"PETIT",   comp:null,       reason:"12' — trop petit"}},
  "NGC891": {name:"NGC 891 — Tranche",             filter:"rgb",     emission:false,desc:"Spirale vue par la tranche avec bande de poussière.", notes:"Automne.",                                                         rating:{stars:0,tag:"—",      comp:null,       reason:null}},
  "NGC2403":{name:"NGC 2403 — Spirale cachée",     filter:"rgb",     emission:false,desc:"Grande spirale circumpolaire avec régions HII.",      notes:"Circumpolaire. Hiver/printemps.",                                   rating:{stars:3,tag:"MOYEN",   comp:null,       reason:"Galaxie 22' — régions HII, correct"}},
  "NGC2683":{name:"NGC 2683 — UFO",                filter:"rgb",     emission:false,desc:"Galaxie spirale vue par la tranche.",                 notes:"Hiver/printemps.",                                                 rating:{stars:2,tag:"PETIT",   comp:null,       reason:"9' — trop petit"}},
  "NGC2841":{name:"NGC 2841 — Spirale floquée",    filter:"rgb",     emission:false,desc:"Belle spirale dans la Grande Ourse.",                 notes:"Printemps. Circumpolaire.",                                        rating:{stars:2,tag:"PETIT",   comp:null,       reason:"9' — trop petit"}},
  "NGC3115":{name:"NGC 3115 — Fuseau",             filter:"rgb",     emission:false,desc:"Galaxie elliptique lenticulaire allongée.",           notes:"Printemps. Basse.",                                                rating:{stars:2,tag:"PETIT",   comp:null,       reason:"8' — trop petit"}},
  "NGC3628":{name:"NGC 3628 — Hamburger",          filter:"rgb",     emission:false,desc:"Troisième membre du Leo Triplet, vue par la tranche.",notes:"Printemps. CIBLE PHARE !",                                         rating:{stars:4,tag:"BON",    comp:"M65,M66",  reason:"Hamburger + queue de marée — Leo Triplet"}},
  "NGC3718":{name:"NGC 3718 — Winding",            filter:"rgb",     emission:false,desc:"Galaxie perturbée dans la Grande Ourse.",             notes:"Printemps. Circumpolaire.",                                        rating:{stars:2,tag:"PETIT",   comp:null,       reason:"9' — trop petit"}},
  "NGC4244":{name:"NGC 4244 — Silver Needle",      filter:"rgb",     emission:false,desc:"Galaxie spirale très fine vue par la tranche.",       notes:"Printemps.",                                                       rating:{stars:2,tag:"PETIT",   comp:null,       reason:"16' — galaxie fine, trop petite"}},
  "NGC4565":{name:"NGC 4565 — Needle",             filter:"rgb",     emission:false,desc:"L'une des plus belles vues par la tranche.",          notes:"Printemps.",                                                       rating:{stars:3,tag:"MOYEN",   comp:null,       reason:"Needle 16' — galaxie fil élégante, petit"}},
  "NGC4631":{name:"NGC 4631 — Baleine",            filter:"rgb",     emission:false,desc:"Galaxie baleine avec compagnon NGC 4627.",            notes:"Printemps.",                                                       rating:{stars:3,tag:"MOYEN",   comp:null,       reason:"Baleine 15' — petit mais beau en Ha"}},
  "MarkarianChain":{name:"Chaîne de Markarian",        filter:"rgb",     emission:false,desc:"Composition dense du cœur de l'amas de la Vierge autour de M84 et M86.",notes:"Printemps. Champ grand champ très rentable, vrai sujet de composition.",astrobinQuery:"Markarian Chain",groupMembers:["M84","M86","NGC4435","NGC4438","NGC4461","NGC4458","NGC4473","NGC4477"],rating:{stars:5,tag:"IDÉAL",   comp:"M84,M86,NGC4435,NGC4438",reason:"Chaîne de galaxies serrées — composition iconique taillée pour 3°×2°"}},
  "IC405_IC410_IC417":{name:"IC 405 + IC 410 + IC 417",filter:"lextreme",emission:true, desc:"Grand champ Auriga réunissant Flaming Star, Têtards et la région de IC 417.",notes:"Hiver. Très bon projet L-eXtreme en grand champ sans mosaïque lourde.",astrobinQuery:"IC 405 IC 410 IC 417",groupMembers:["IC405","IC410","IC417"],rating:{stars:5,tag:"IDÉAL",   comp:"IC410",   reason:"Trio Ha d'Auriga — composition hivernale large et très photogénique"}},
  "NGC7822":{name:"NGC 7822 / Ced 214–214A",       filter:"lextreme",emission:true, desc:"Grand complexe Ha de Céphée avec la zone Ced 214–214A intégrée au champ.",notes:"Automne/hiver. Grand champ naturel, excellent en L-eXtreme.",astrobinQuery:"NGC 7822 Ced 214 214A",groupMembers:["Ced214","Ced214A"],rating:{stars:5,tag:"IDÉAL",   comp:null,       reason:"Grand champ Ha spectaculaire — parfaitement adapté au setup"}},
  "IC5146": {name:"IC 5146 — Cocoon",              filter:"rgb",     emission:false,desc:"Nébuleuse Cocoon et son environnement poussiéreux dans le Cygne.",notes:"Été/automne. RGB prioritaire pour préserver les poussières, duo-band possible en appoint.",astrobinQuery:"IC 5146 Cocoon",rating:{stars:4,tag:"BON",    comp:null,       reason:"Cocoon + poussières — petit cœur mais champ global très intéressant"}},
  "M94":    {name:"M94 — Croc de dragon",          filter:"rgb",     emission:false,desc:"Galaxie spirale brillante des Chiens de Chasse, compacte mais facile à intégrer.",notes:"Printemps. Messier utile pour étoffer la saison malgré une taille modeste.",rating:{stars:2,tag:"PETIT",   comp:null,       reason:"Messier compact et brillant — défendable mais reste petit à 450 mm"}},
  "NGC4490_NGC4485":{name:"NGC 4490 + NGC 4485 — Cocoon Galaxy",filter:"rgb",emission:false,desc:"Paire de galaxies en interaction dans les Chiens de Chasse.",notes:"Printemps. Petit duo mais lisible et nettement plus intéressant qu'une galaxie isolée.",astrobinQuery:"NGC 4490 NGC 4485",groupMembers:["NGC4490","NGC4485"],rating:{stars:3,tag:"MOYEN",   comp:null,       reason:"Duo interactif compact — petit mais photogénique en grand champ"}},
  "NGC5005":{name:"NGC 5005 — Spirale CV",         filter:"rgb",     emission:false,desc:"Belle spirale dans les Chiens de Chasse.",            notes:"Printemps.",                                                       rating:{stars:2,tag:"PETIT",   comp:null,       reason:"6' — trop petit"}},
  "NGC7331":{name:"NGC 7331 — Spirale",            filter:"rgb",     emission:false,desc:"Belle spirale dans Pégase avec galaxies compagnes.",  notes:"Automne.",                                                         rating:{stars:2,tag:"PETIT",   comp:null,       reason:"Galaxie 11' — trop petite"}},
  "IC342":  {name:"IC 342 — Galaxie cachée",       filter:"rgb",     emission:false,desc:"Grande spirale circumpolaire derrière la Voie Lactée.",notes:"Circumpolaire. Difficile : voile galactique.",                    rating:{stars:3,tag:"MOYEN",   comp:null,       reason:"Galaxie cachée 20' — obscurcie mais photogénique"}},
  "IC1296": {name:"IC 1296 — près M57",            filter:"rgb",     emission:false,desc:"Petite galaxie dans le même champ que M57.",          notes:"Défi. Été.",                                                       rating:{stars:1,tag:"MINUSCULE",comp:null,       reason:"Galaxie très faible près M57"}},
  // ── AMAS ─────────────────────────────────────────────────────────
  "M13":    {name:"M13 — Hercule",                 filter:"rgb",     emission:false,desc:"Le plus beau globulaire de l'hémisphère nord.",       notes:"Se lève à l'est après minuit en hiver/printemps !",               rating:{stars:2,tag:"PETIT",   comp:null,       reason:"Amas 20' — trop petit pour 3° de champ"}},
  "M45":    {name:"M45 — Pléiades",                filter:"rgb",     emission:false,desc:"Amas ouvert emblématique avec nébuleuses par réflexion.",notes:"Automne/hiver. RGB Ultra pour la nébulosité.",                  rating:{stars:0,tag:"—",      comp:null,       reason:null}},
  "M46":    {name:"M46 + M47",                     filter:"rgb",     emission:false,desc:"Deux amas ouverts dans le même champ.",               notes:"Hiver. SE en début de nuit.",                                      rating:{stars:2,tag:"PETIT",   comp:null,       reason:"Amas 27' + planétaire — peu spectaculaire"}},
  "NGC869": {name:"NGC 869+884 — Double Amas",     filter:"rgb",     emission:false,desc:"Paire d'amas ouverts jeunes et spectaculaires.",      notes:"Automne/hiver. Circumpolaire.",                                    rating:{stars:3,tag:"MOYEN",   comp:null,       reason:"Double Amas Persée — champ stellaire spectaculaire"}},
  "NGC2244":{name:"NGC 2244 — Amas Rosette",       filter:"rgb",     emission:false,desc:"Amas ouvert au centre de la Rosette.",                notes:"Hiver.",                                                           rating:{stars:4,tag:"BON",    comp:"NGC2237",  reason:"Amas Rosette — inséparable de la nébuleuse"}},
};

const RATINGS={
  NGC2237:{stars:5,tag:"IDÉAL",   comp:"NGC2244", reason:"Rosette 1.3° — remplit parfaitement le champ"},
  NGC7000:{stars:5,tag:"IDÉAL",   comp:null,       reason:"Amérique du Nord 2° — grand champ parfait"},
  IC2177: {stars:5,tag:"IDÉAL",   comp:"Sh2-296",  reason:"Mouette 2° + Est — panorama Ha parfait"},
  Elephant:{stars:5,tag:"IDÉAL",  comp:null,       reason:"Trompe Éléphant 2.5° — grand champ parfait"},
  NGC1499:{stars:5,tag:"IDÉAL",   comp:null,       reason:"Californie 2.5° — remplit le champ en longueur"},
  "Sh2-129":{stars:5,tag:"IDÉAL", comp:null,       reason:"Flying Bat 2.5° + Ou4 Giant Squid — duo ultra-rare"},
  M42:    {stars:5,tag:"IDÉAL",   comp:"M43",      reason:"M42+M43+Running Man — trio iconique dans 1.5°"},
  "Sh2-119":{stars:5,tag:"IDÉAL", comp:null,       reason:"2° — remplit parfaitement le champ, Ha brillant"},
  NGC6992:{stars:5,tag:"IDÉAL",   comp:null,       reason:"Voile du Cygne E — filaments sur 1°, splendide"},
  NGC2024:{stars:5,tag:"IDÉAL",   comp:"IC434",    reason:"Flamme + Tête de Cheval — combo parfait dans 1°"},
  IC434:  {stars:5,tag:"IDÉAL",   comp:"NGC2024",  reason:"Tête de Cheval + Flamme — même champ iconique"},
  M43:    {stars:5,tag:"IDÉAL",   comp:"M42",      reason:"Extension M42 — inséparable du trio Orion"},
  NGC1977:{stars:5,tag:"IDÉAL",   comp:"M42,M43",  reason:"Running Man + M42 — OIII spectaculaire"},
  "Sh2-132":{stars:4,tag:"BON",   comp:null,       reason:"Lion Nebula 50' — bon remplissage Ha+OIII"},
  "Sh2-155":{stars:4,tag:"BON",   comp:null,       reason:"Cave Nebula 50' — bien cadré en Ha"},
  NGC6888:{stars:4,tag:"BON",     comp:null,       reason:"Croissant — Ha+OIII intense, bien cadré"},
  "Sh2-101":{stars:4,tag:"BON",   comp:null,       reason:"Tulipe 16' + champ Cygnus X-1 — contexte unique"},
  IC1805: {stars:4,tag:"BON",     comp:"IC1848",   reason:"Cœur — mosaïque avec Âme en 2 panneaux"},
  IC1848: {stars:4,tag:"BON",     comp:"IC1805",   reason:"Âme — mosaïque avec Cœur en 2 panneaux"},
  M97:    {stars:4,tag:"BON",     comp:"M108",     reason:"Chouette + M108 galaxy — duo dans 30' de champ"},
  M108:   {stars:4,tag:"BON",     comp:"M97",      reason:"Galaxie + M97 planétaire — composition unique"},
  M81:    {stars:4,tag:"BON",     comp:"M82",      reason:"Bode + Cigare — 37' séparation, duo classique"},
  M82:    {stars:4,tag:"BON",     comp:"M81",      reason:"Cigare + Bode — filaments Ha spectaculaires"},
  M65:    {stars:4,tag:"BON",     comp:"M66,NGC3628",reason:"Leo Triplet — 3 galaxies dans 1.5°"},
  M66:    {stars:4,tag:"BON",     comp:"M65,NGC3628",reason:"Leo Triplet — 3 galaxies dans 1.5°"},
  NGC3628:{stars:4,tag:"BON",     comp:"M65,M66",  reason:"Hamburger + queue de marée — Leo Triplet"},
  M51:    {stars:4,tag:"BON",     comp:null,       reason:"Tourbillon + NGC5195 — iconique"},
  "Sh2-216":{stars:4,tag:"BON",   comp:null,       reason:"Planétaire 100' — très rare, OIII dominant"},
  NGC2174:{stars:4,tag:"BON",     comp:null,       reason:"Monkey Head 40' — Ha spectaculaire"},
  "Sh2-252":{stars:4,tag:"BON",   comp:null,       reason:"Monkey Head 40' — Ha spectaculaire"},
  "Sh2-261":{stars:4,tag:"BON",   comp:null,       reason:"Lower's Nebula 60' — peu connue, superbe Ha"},
  "Sh2-273":{stars:4,tag:"BON",   comp:null,       reason:"Cone + Christmas Tree NGC2264 — iconique"},
  NGC2244:{stars:4,tag:"BON",     comp:"NGC2237",  reason:"Amas Rosette — inséparable de la nébuleuse"},
  IC410:  {stars:4,tag:"BON",     comp:null,       reason:"Têtards 40' — Ha spectaculaire, amas au centre"},
  M31:    {stars:4,tag:"BON",     comp:"M32,M110", reason:"Andromède centre + satellites — composition riche"},
  M33:    {stars:4,tag:"BON",     comp:null,       reason:"Triangle 70'×45' — régions HII visibles en Ha"},
  PacMan: {stars:4,tag:"BON",     comp:null,       reason:"NGC281 PacMan 35' — Ha vif, très photogénique"},
  Bubble: {stars:4,tag:"BON",     comp:"M52",      reason:"Bubble NGC7635 + M52 — duo Ha classique"},
  "Sh2-296":{stars:4,tag:"BON",   comp:"IC2177",   reason:"Mouette Ouest — complémentaire à IC2177"},
  "Sh2-157":{stars:4,tag:"BON",   comp:null,       reason:"Lobster Claw 60' — Ha+OIII, Cassiopée"},
  M8:     {stars:4,tag:"BON",     comp:null,       reason:"Lagon 90'×40' — nébuleuse + amas"},
  M101:   {stars:3,tag:"MOYEN",   comp:null,       reason:"Moulin 30' — remplissage moyen pour 3° de champ"},
  "Sh2-264":{stars:3,tag:"MOYEN", comp:null,       reason:"Angel 3° — trop grand, 2 panneaux nécessaires"},
  NGC4631:{stars:3,tag:"MOYEN",   comp:null,       reason:"Baleine 15' — petit mais beau en Ha"},
  M78:    {stars:3,tag:"MOYEN",   comp:null,       reason:"8' nébuleuse réflexion — contexte stellaire riche"},
  NGC2359:{stars:3,tag:"MOYEN",   comp:null,       reason:"Casque Thor 8' — Ha spectaculaire mais petit"},
  "Sh2-142":{stars:3,tag:"MOYEN", comp:null,       reason:"Wizard NGC7380 — avec amas, bon Ha"},
  NGC2403:{stars:3,tag:"MOYEN",   comp:null,       reason:"Galaxie 22' — régions HII, correct"},
  M63:    {stars:3,tag:"MOYEN",   comp:null,       reason:"Tournesol 13' — spirale serrée, correct"},
  M106:   {stars:3,tag:"MOYEN",   comp:null,       reason:"Spirale 19' — halos Ha visibles"},
  "Sh2-86":{stars:3,tag:"MOYEN",  comp:null,       reason:"60' nébuleuse Vulpecula — assez bien cadré"},
  "Sh2-68":{stars:3,tag:"MOYEN",  comp:null,       reason:"60' planétaire rare OIII — peu connue"},
  NGC4565:{stars:3,tag:"MOYEN",   comp:null,       reason:"Needle 16' — galaxie fil élégante, petit"},
  NGC869: {stars:3,tag:"MOYEN",   comp:null,       reason:"Double Amas Persée — champ stellaire spectaculaire"},
  "Sh2-112":{stars:3,tag:"MOYEN", comp:"Sh2-115",  reason:"Sh2-112 + Sh2-115 dans le même champ"},
  "Sh2-115":{stars:3,tag:"MOYEN", comp:"Sh2-112",  reason:"Sh2-115 + Sh2-112 dans le même champ"},
  IC342:  {stars:3,tag:"MOYEN",   comp:null,       reason:"Galaxie cachée 20' — obscurcie mais photogénique"},
  M13:    {stars:2,tag:"PETIT",   comp:null,       reason:"Amas 20' — trop petit pour 3° de champ"},
  M27:    {stars:2,tag:"PETIT",   comp:null,       reason:"Haltères 8' — mieux à plus longue focale"},
  M1:     {stars:2,tag:"PETIT",   comp:null,       reason:"Crabe 7' — trop petit pour grand champ"},
  M51:    {stars:4,tag:"BON",     comp:null,       reason:"Tourbillon + NGC5195 — icône astrophoto"},
  M13:    {stars:2,tag:"PETIT",   comp:null,       reason:"Amas 20' — trop petit pour 3° de champ"},
  M109:   {stars:2,tag:"PETIT",   comp:null,       reason:"12' — trop petit"},
  NGC5005:{stars:2,tag:"PETIT",   comp:null,       reason:"6' — trop petit"},
  NGC4244:{stars:2,tag:"PETIT",   comp:null,       reason:"16' — galaxie fine, trop petite"},
  NGC3718:{stars:2,tag:"PETIT",   comp:null,       reason:"9' — trop petit"},
  NGC2841:{stars:2,tag:"PETIT",   comp:null,       reason:"9' — trop petit"},
  NGC3115:{stars:2,tag:"PETIT",   comp:null,       reason:"8' — trop petit"},
  NGC2683:{stars:2,tag:"PETIT",   comp:null,       reason:"9' — trop petit"},
  "Sh2-274":{stars:2,tag:"PETIT", comp:null,       reason:"Méduse 10' — OIII intéressant mais petit"},
  NGC7331:{stars:2,tag:"PETIT",   comp:null,       reason:"Galaxie 11' — trop petite"},
  M57:    {stars:1,tag:"MINUSCULE",comp:null,      reason:"Anneau 1' — focale courte non adaptée"},
  NGC2392:{stars:1,tag:"MINUSCULE",comp:null,      reason:"Eskimo 47'' — beaucoup trop petit"},
  IC1296: {stars:1,tag:"MINUSCULE",comp:null,      reason:"Galaxie très faible près M57"},
  "Sh2-162":{stars:3,tag:"MOYEN", comp:"M52",      reason:"Bubble NGC7635 — voir entrée Bubble"},
  "Sh2-188":{stars:3,tag:"MOYEN", comp:null,       reason:"Escargot planétaire 8' — rare, asymétrique"},
  "Sh2-200":{stars:3,tag:"MOYEN", comp:null,       reason:"Nébuleuse Cassiopée"},
  "Sh2-205":{stars:3,tag:"MOYEN", comp:null,       reason:"Nébuleuse Persée"},
  "Sh2-232":{stars:3,tag:"MOYEN", comp:null,       reason:"Nébuleuse Aurige — Ha"},
  "Sh2-235":{stars:3,tag:"MOYEN", comp:null,       reason:"Nébuleuse Aurige — Ha"},
  "Sh2-292":{stars:3,tag:"MOYEN", comp:"Sh2-296",  reason:"Mouette Ouest partie — Ha"},
  NGC1514:{stars:2,tag:"PETIT",   comp:null,       reason:"2' planétaire — trop petit"},
  M46:    {stars:2,tag:"PETIT",   comp:null,       reason:"Amas 27' + planétaire — peu spectaculaire"},
  M64:    {stars:2,tag:"PETIT",   comp:null,       reason:"Oeil Noir 10' — trop petit"},
  "Sh2-106":{stars:3,tag:"MOYEN", comp:null,       reason:"Bipolaire 3' — très petit mais spectaculaire"},
};

// Accesseurs et helpers de notation
function skyFrameRatingTranslate(key, fallback, params){
  return window.SkyFrameI18n ? window.SkyFrameI18n.translate(key, params) : fallback;
}

function localizeRatingTag(tag){
  const normalized=(tag||'').trim();
  const map={
    'IDÉAL':'rating.tag.ideal',
    'BON':'rating.tag.good',
    'MOYEN':'rating.tag.average',
    'PETIT':'rating.tag.small',
    'MINUSCULE':'rating.tag.tiny',
    '—':'rating.tag.none'
  };
  return map[normalized]
    ? skyFrameRatingTranslate(map[normalized], normalized)
    : normalized;
}

function localizeRatingReason(reason){
  if(!reason) return reason;
  const map={
    'Non évalué':'rating.reason.unrated'
  };
  return map[reason]
    ? skyFrameRatingTranslate(map[reason], reason)
    : reason;
}

function getRating(id){
  const base=(CUSTOM_META[id]&&CUSTOM_META[id].rating)||RATINGS[id]||{stars:0,tag:'—',comp:null,reason:'Non évalué'};
  return {
    ...base,
    tag:localizeRatingTag(base.tag),
    reason:localizeRatingReason(base.reason)
  };
}

function renderStars(n){
  if(!n) return '<span style="color:var(--text3);font-size:10px">—</span>';
  let s='<span class="rating-stars">';
  for(let i=1;i<=5;i++) s+=`<span class="${i<=n?'s-on':'s-off'}">★</span>`;
  return s+'</span>';
}

function ratingTagCls(n){return['','t1','t2','t3','t4','t5'][Math.min(5,Math.max(0,n))];}
