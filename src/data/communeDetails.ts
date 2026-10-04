// Editorial brief for each of Kinshasa's 24 communes (tagline, history,
// economy, key districts, map center). Shared by the commune pages and the
// homepage's commune carousel. Moved out of src/app/commune/[name]/page.tsx.

export type CommuneBrief = {
  tagline: string;
  specification: string;
  history: string;
  economy: string;
  keyDistricts: string[];
  lat: number;
  lng: number;
  zoom: number;
};

export const COMMUNE_DETAILS: Record<string, CommuneBrief> = {
  Bandalungwa: {
    tagline: 'Le temple de la sapologie, de la musique et de la vie nocturne kinois.',
    specification: 'Surnommée "Bandal c\'est Paris", cette commune festive est le cœur battant de la jeunesse, des maquis traditionnels, du couper-décaler et des tendances culinaires urbaines.',
    history: 'Conçue dans les années 1950 comme une cité ouvrière modèle avec un plan en damier rigoureux, Bandal a progressivement été investie par les artistes et musiciens de la Rumba Congolaise.',
    economy: 'Économie créative et de divertissement : centaines de bars/maquis, terrasses lounge, salons de coiffure de luxe, boutiques de mode et restauration rapide locale.',
    keyDistricts: ['Bandal Synfact', 'Makelele', 'Bandal Moulaert', 'Tshibangu'],
    lat: -4.340,
    lng: 15.285,
    zoom: 14.0
  },
  Barumbu: {
    tagline: 'Le pôle historique portuaire et aéronautique du vieux Kinshasa.',
    specification: 'Située au nord le long du fleuve Congo et jouxtant Gombe, Barumbu abrite l\'Aéroport de Ndolo ainsi que des zones portuaires et artisanales historiques.',
    history: 'Une des communes fondatrices de la capitale coloniale Léopoldville, développée au début du XXe siècle pour accueillir les travailleurs des installations portuaires et ferroviaires.',
    economy: 'Transport aérien secondaire, logistique portuaire, pièces de rechange automobile, dépôts de matériaux de construction et marchés informels.',
    keyDistricts: ['Aéroport de Ndolo', 'Bon Marché', 'Quartier du Port'],
    lat: -4.308,
    lng: 15.315,
    zoom: 14.0
  },
  Bumbu: {
    tagline: 'La cité populaire sud au dynamisme artisanal et communautaire.',
    specification: 'Commune populaire et dense du sud de Kinshasa, caractérisée par une intense vie de quartier et un artisanat prolifique.',
    history: 'Développée lors de la forte poussée démographique post-indépendance des années 1960 et 1970.',
    economy: 'Petits commerces de quartier, ateliers de menuiserie et ferronnerie, couturiers et marchés alimentaires de proximité.',
    keyDistricts: ['Avenue de la Foire', 'Bumbu Centre', 'Rond-point Kasavubu'],
    lat: -4.370,
    lng: 15.295,
    zoom: 14.0
  },
  Gombe: {
    tagline: 'Le centre névralgique des affaires, du pouvoir et de la haute gastronomie.',
    specification: 'Gombe (anciennement Kalina) est le Centre d\'Affaires Central (CBD) de Kinshasa. Elle abrite les ministères, ambassades, sièges de banques internationales, hôtels 5 étoiles et restaurants gastronomiques.',
    history: 'Fondée à l\'époque coloniale autour de la baie de Ngaliema et du fleuve Congo, la commune tire son nom de la rivière Gombe. Elle a longtemps été le quartier européen exclusif avant d\'évoluer en cœur administratif et financier du pays.',
    economy: 'Secteur tertiaire dominant : services financiers, diplomatie, sièges d\'entreprises multinationales, hôtellerie de luxe et restauration haut de gamme. C\'est la zone à plus forte valeur foncière de RDC.',
    keyDistricts: ['Blvd du 30 Juin', 'Golf', 'Gare Centrale', 'Socimat', 'Fleuve Congo Hotel'],
    lat: -4.305,
    lng: 15.302,
    zoom: 13.5
  },
  Kalamu: {
    tagline: 'Berceau mythique de la Rumba Congolaise et carrefour culturel.',
    specification: 'Inscrite au patrimoine culturel avec le mythique quartier Matonge et la Place Victoire, Kalamu est la capitale de l\'expression musicale et populaire de Kinshasa.',
    history: 'Nommée en hommage à la rivière Kalamu, elle s\'est développée dès 1940. Matonge y est devenu mondialement connu comme le sanctuaire des orchestres de rumba et des stars de la musique.',
    economy: 'Commerce de proximité, bars musicaux historiques, studios d\'enregistrement, marchés de tissus et confection de mode urbaine.',
    keyDistricts: ['Matonge', 'Place Victoire', 'Yolo Nord', 'Yolo Sud', 'Stade Tata Raphaël'],
    lat: -4.345,
    lng: 15.310,
    zoom: 13.8
  },
  'Kasa-Vubu': {
    tagline: 'Cité civique et politique nommée en l\'honneur du premier Président.',
    specification: 'Commune centrale emblématique abritant la Maison Communale historique, l\'avenue Assossa et le marché Mariana.',
    history: 'Anciennement nommée Dendale, elle a été rebaptisée Kasa-Vubu en hommage au premier président de la République Démocratique du Congo, Joseph Kasa-Vubu.',
    economy: 'Grand marché artisanal, vente d\'imprimerie et librairies, commerces de vivres frais et restauration populaire.',
    keyDistricts: ['Place Mariana', 'Avenue Assossa', 'Marché Kasa-Vubu'],
    lat: -4.335,
    lng: 15.305,
    zoom: 14.0
  },
  Kimbanseke: {
    tagline: 'La géante démographique et le carrefour créatif de l\'Est.',
    specification: 'La plus vaste commune urbaine de Kinshasa en termes de population, réputée pour sa culture populaire vivante et ses communautés de création indépendante.',
    history: 'Bâtie sur les collines à l\'est de la capitale, elle est nommée d\'après le prophète Simon Kimbangu et conserve un fort patrimoine spirituel et communautaire.',
    economy: 'Agriculture périurbaine, marchés d\'échange de produits agricoles provenant du Kongo-Central et du Kwango, très forte économie informelle et artisanale.',
    keyDistricts: ['Mokali', 'Kingasani', 'Tshangu Centre'],
    lat: -4.420,
    lng: 15.420,
    zoom: 12.0
  },
  Kinshasa: {
    tagline: 'Le cœur historique et le géant commercial de Zando.',
    specification: 'Commune homonyme qui abrite le Marché Central de Kinshasa (surnommé Zando), véritable carrefour d\'approvisionnement de la sous-région.',
    history: 'Cœur historique du marché colonial initial autour duquel la métropole s\'est métamorphosée.',
    economy: 'Grossistes textiles, import-export, matériel électronique, friperie et gigantesque hub commercial quotidien.',
    keyDistricts: ['Grand Marché Zando', 'Avenue Kasa-Vubu', 'Marché Somba Zikida'],
    lat: -4.315,
    lng: 15.312,
    zoom: 14.0
  },
  Kintambo: {
    tagline: 'Carrefour historique et pôle commercial stratégique.',
    specification: 'Une des plus anciennes communes de la ville, située à la jonction entre Gombe, Ngaliema et le fleuve, réputée pour son pôle commercial de Kintambo Magasin.',
    history: 'Lieu de contact initial entre les populations autochtones Teke/Humbu et les expéditions européennes à la fin du XIXe siècle.',
    economy: 'Commerce de transit, grands marchés de vêtements, centres de transport en commun et petits métiers d\'artisanat.',
    keyDistricts: ['Kintambo Magasin', 'Velodrome', 'Jamaique'],
    lat: -4.318,
    lng: 15.280,
    zoom: 14.0
  },
  Kisenso: {
    tagline: 'La cité escarpée des collines sud.',
    specification: 'Située au bord du plateau de la rive droite de la N\'djili, Kisenso est une commune résidentielle escarpée à forte cohésion sociale.',
    history: 'Formée par l\'extension urbaine rapide du sud de Kinshasa au milieu du XXe siècle.',
    economy: 'Culture maraîchère à petite échelle, commerces vivriers et petite mécanique de quartier.',
    keyDistricts: ['Regideso Kisenso', 'Kisenso Gare', 'Amba'],
    lat: -4.425,
    lng: 15.335,
    zoom: 13.5
  },
  Lemba: {
    tagline: 'La cité universitaire intellectuelle et estudiantine.',
    specification: 'Commune académique abritant l\'Université de Kinshasa (UNIKIN) et le Commissariat Général à l\'Énergie Atomique (CGEA).',
    history: 'Planifiée dans les années 1960 pour accueillir l\'élite universitaire et le personnel enseignant de la première université du pays.',
    economy: 'Économie du savoir, logements étudiants, papeteries, bars estudiantins, centres de recherche et commerces de restauration populaire.',
    keyDistricts: ['UNIKIN', 'Lemba Super', 'Righini', 'Echangeur'],
    lat: -4.410,
    lng: 15.315,
    zoom: 13.2
  },
  Limete: {
    tagline: 'Entre pôle industriel, galeries d\'art et résidences de prestige.',
    specification: 'Séparée par le Boulevard Lumumba en zones Industrielle et Résidentielle, Limete est réputée pour sa verdure, ses brasseries, ses galeries d\'art contemporain et la célèbre Tour de l\'Échangeur.',
    history: 'Aménagée dans les années 1950 pour concentrer l\'activité industrielle de la capitale, Limete est devenue le symbole de la modernité industrielle congolaise avec ses larges avenues arborées.',
    economy: 'Lourde présence industrielle (Brasseries Bralima/Haggar, transformation agro-alimentaire, usines textiles), ateliers d\'art, concessions automobiles et secteur résidentiel aisé.',
    keyDistricts: ['Limete Résidentiel', 'Zone Industrielle', 'Échangeur', 'Météo'],
    lat: -4.350,
    lng: 15.330,
    zoom: 13.0
  },
  Lingwala: {
    tagline: 'Le centre des médias, des institutions parlementaires et du sport.',
    specification: 'Commune abritant le Palais du Peuple (Parlement), le Stade des Martyrs (80 000 places) et la RTNC (Radio Télévision Nationale Congolaise).',
    history: 'Autrefois appelée Saint-Jean, Lingwala a été un foyer politique majeur lors de la décolonisation congolaise.',
    economy: 'Services gouvernementaux, événementiel sportif et culturel, bars-terrasses et sièges d\'entreprises de médias.',
    keyDistricts: ['Stade des Martyrs', 'Palais du Peuple', 'RTNC', 'Avenue Nyangwe'],
    lat: -4.320,
    lng: 15.295,
    zoom: 14.0
  },
  Makala: {
    tagline: 'Au cœur des voies de communication du sud de Kinshasa.',
    specification: 'Commune centrale de liaison reliant Selembao, Ngaba et Kalamu via l\'avenue Elengesa.',
    history: 'Développée au fil de l\'urbanisation spontanée et du désenclavement du sud de la capitale.',
    economy: 'Marchés de quartier, dépôts de briques et matériaux, réparation automobile et petits commerces.',
    keyDistricts: ['Elengesa', 'Marché Makala', 'Bongolo'],
    lat: -4.385,
    lng: 15.305,
    zoom: 13.8
  },
  Maluku: {
    tagline: 'Le géant éco-touristique, agricole et industriel sur les rives du fleuve.',
    specification: 'Superficie record couvrant plus de 75% du territoire de la province de Kinshasa, réputée pour ses fermes, ses parcs nature et son site sidérurgique.',
    history: 'Vaste réserve territoriale et fluviale historiquement occupée par les Teke humbu, intégrée dans le grand projet d\'industrialisation du pays.',
    economy: 'Agriculture maraîchère de grande échelle, élevage, parcs éco-touristiques, zones franches industrielles et pêche fluviale.',
    keyDistricts: ['Maluku Centre', 'Kinkole Pêcheurs', 'N\'douo', 'Menkao'],
    lat: -4.320,
    lng: 15.800,
    zoom: 10.0
  },
  Masina: {
    tagline: 'Surnommée "Chine Populaire" pour sa densité et son dynamisme commercial.',
    specification: 'Porte d\'entrée Est de Kinshasa longeant le Boulevard Lumumba, connue pour sa vitalité entrepreneuriale et son Marché de la Liberté.',
    history: 'Surnommée ainsi en référence à son impressionnante densité humaine et à l\'esprit débrouillard et actif de ses habitants.',
    economy: 'Grand Marché de la Liberté (l\'un des plus grands marchés couverts du pays), transit routier et pièces mécaniques.',
    keyDistricts: ['Marché de la Liberté', 'Sans Fil', 'PASCAL', 'Abattoir'],
    lat: -4.380,
    lng: 15.390,
    zoom: 12.5
  },
  Matete: {
    tagline: 'Le modèle d\'urbanisme populaire et carrefour marchand.',
    specification: 'Reconnue pour son plan d\'aménagement régulier en quartiers numérotés et son Marché central de Matete très fréquenté.',
    history: 'Conçue dans les années 1950 sous un modèle urbanistique exemplaire d\'intégration sociale.',
    economy: 'Commerce de gros et détail de produits de première nécessité, friperie, quincaillerie et maquis de quartier.',
    keyDistricts: ['Marché de Matete', 'Quartier Anunga', 'Rond-Point Ngaba / Matete'],
    lat: -4.380,
    lng: 15.340,
    zoom: 13.8
  },
  'Mont-Ngafula': {
    tagline: 'Les collines verdoyantes, le sanctuaire des Bonobos et les cités calmes.',
    specification: 'Commune collinéraire du sud-ouest réputée pour ses paysages pittoresques, le sanctuaire Lola ya Bonobo et l\'Université Catholique du Congo.',
    history: 'Zone résidentielle péri-urbaine en plein essor au relief escarpé offrant un climat plus doux que le centre-ville.',
    economy: 'Espaces de loisirs éco-touristiques, hôtellerie de retraite et de détente, enseignement supérieur et projets immobiliers.',
    keyDistricts: ['Kimbondo', 'Lola ya Bonobo', 'Mama Mobutu', 'UCC Mont-Ngafula', 'By Pass'],
    lat: -4.450,
    lng: 15.250,
    zoom: 12.0
  },
  "N'djili": {
    tagline: 'La porte d\'entrée aérienne du Congo et la cité Ste Thérèse.',
    specification: 'Abrite l\'Aéroport International de N\'djili et la célèbre Sainte-Thérèse, grand rassemblement d\'événements culturels et politiques.',
    history: 'Aménagée à partir de 1952 pour offrir un cadre moderne d\'accession à la propriété pour les familles congolaises.',
    economy: 'Services aéroportuaires, fret et transit, restauration, salons d\'événementiel et grand marché commercial.',
    keyDistricts: ['Aéroport International', 'Place Sainte-Thérèse', 'Quartier 1 à 13'],
    lat: -4.400,
    lng: 15.370,
    zoom: 13.0
  },
  "N'sele": {
    tagline: 'L\'oasis champêtre, éco-touristique et fluviale de Kinshasa.',
    specification: 'Immense commune peri-urbaine située à l\'Est, réputée pour le Parc de la N\'Sele, ses domaines aquatiques et ses résidences secondaires au bord de l\'eau.',
    history: 'Créée sous la 2ème République pour abriter la cité agro-industrielle présidentielle et le Domaine de la N\'Sele.',
    economy: 'Tourisme vert, hébergement de weekend, complexes hôteliers au bord du fleuve Congo, agriculture maraîchère et pisciculture.',
    keyDistricts: ['Kinkole', 'Domaine de la N\'Sele', 'Mikonga'],
    lat: -4.380,
    lng: 15.550,
    zoom: 11.5
  },
  Ngaba: {
    tagline: 'Carrefour commercial et foyer d\'artisanat vivace.',
    specification: 'Située sur l\'axe stratégique du rond-point Ngaba reliant le centre-ville aux universités et aux communes de l\'est.',
    history: 'Née de l\'expansion commerciale du quartier sud dans les années 1960-1970.',
    economy: 'Revente de vivres en provenance du Bas-Congo, réparations électroniques et marchands ambulants.',
    keyDistricts: ['Rond-point Ngaba', 'Avenue Baobab', 'Marché de Ngaba'],
    lat: -4.395,
    lng: 15.320,
    zoom: 14.0
  },
  Ngaliema: {
    tagline: 'Le sommet diplomatique et résidentiel surplombant le Fleuve Congo.',
    specification: 'Surplombant le fleuve Congo depuis ses collines verdoyantes, Ngaliema abrite le Palais de la Nation, la Cité de l\'Union Africaine ainsi que les résidences huppées de Binza.',
    history: 'C\'est ici qu\'Henry Morton Stanley établit son campement en 1881 face au chef Ngaliema. Le Mont Ngaliema conserve les vestiges du passé colonial et présidentiel.',
    economy: 'Immobilier de très haut standing (Binza Macampagne, Pigeon, IPN), tourisme historique, institutions gouvernementales et complexes hôteliers panoramiques.',
    keyDistricts: ['Binza Macampagne', 'Binza Pigeon', 'Binza Ozone', 'Mont Ngaliema', 'Kintambo Magasin'],
    lat: -4.335,
    lng: 15.260,
    zoom: 12.8
  },
  'Ngiri-Ngiri': {
    tagline: 'Cité historique compacte et communauté solidaire.',
    specification: 'Une des communes les plus denses de Kinshasa, réputée pour son ambiance de quartier fraternelle et ses ateliers d\'artisans.',
    history: 'Bâtie dans les années 1950, elle s\'est développée avec un plan d\'alignement strict autour de l\'Avenue 24 Novembre.',
    economy: 'Boutiques de tailleurs, garages de réparation, petits marchés de vivres et nganda traditionnels.',
    keyDistricts: ['Avenue Assossa', 'Avenue Saïo', '24 Novembre Ngiri-Ngiri'],
    lat: -4.355,
    lng: 15.298,
    zoom: 14.2
  },
  Selembao: {
    tagline: 'Commune des collines ouest et lieu de passage vers le Kongo-Central.',
    specification: 'S\'étendant le long de la route de Matadi sur les hauteurs de la ville, avec un panorama imprenable sur le bassin kinois.',
    history: 'Commune pionnière pour l\'accueil des voyageurs et marchandises en provenance de la côte Atlantique.',
    economy: 'Transit de marchandises, carrières de pierres de construction, dépôts de matériaux et fermes maraîchères.',
    keyDistricts: ['Badiadingi', 'Marché Selembao', 'Cité Verte'],
    lat: -4.365,
    lng: 15.275,
    zoom: 13.5
  }
};

export const ALL_KINSHASA_COMMUNES = Object.keys(COMMUNE_DETAILS).sort();

export const DEFAULT_COMMUNE_BRIEF: CommuneBrief = {
  tagline: 'Une commune vivante et authentique du grand Kinshasa.',
  specification: 'Commune intégrante du tissu urbain de Kinshasa, caractérisée par une vie communautaire dynamique, des marchés locaux animés et une population accueillante.',
  history: 'Développée au cours de la grande expansion démographique de la capitale congolaise au XXe siècle.',
  economy: 'Commerce de détail, marchés publics de vivres frais, services de proximité et petites entreprises artisanales.',
  keyDistricts: ['Centre Commune', 'Grand Marché', 'Avenue Principale'],
  lat: -4.325,
  lng: 15.300,
  zoom: 12.5
};

