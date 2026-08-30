'use client';

import { useState, useEffect, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import { supabase } from '../../../lib/supabase';

const COMMUNE_DETAILS: Record<string, {
  tagline: string;
  specification: string;
  history: string;
  economy: string;
  keyDistricts: string[];
  lat: number;
  lng: number;
  zoom: number;
}> = {
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

const ALL_KINSHASA_COMMUNES = Object.keys(COMMUNE_DETAILS).sort();

const DEFAULT_COMMUNE_BRIEF = {
  tagline: 'Une commune vivante et authentique du grand Kinshasa.',
  specification: 'Commune intégrante du tissu urbain de Kinshasa, caractérisée par une vie communautaire dynamique, des marchés locaux animés et une population accueillante.',
  history: 'Développée au cours de la grande expansion démographique de la capitale congolaise au XXe siècle.',
  economy: 'Commerce de détail, marchés publics de vivres frais, services de proximité et petites entreprises artisanales.',
  keyDistricts: ['Centre Commune', 'Grand Marché', 'Avenue Principale'],
  lat: -4.325,
  lng: 15.300,
  zoom: 12.5
};

export default function CommuneDetailPage() {
  const params = useParams();
  const router = useRouter();

  const rawName = (params?.name as string) || 'Gombe';
  const communeName = decodeURIComponent(rawName).trim();
  const communeInfo = COMMUNE_DETAILS[communeName] || DEFAULT_COMMUNE_BRIEF;

  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<maplibregl.Map | null>(null);

  const [places, setPlaces] = useState<any[]>([]);
  const [events, setEvents] = useState<any[]>([]);

  useEffect(() => {
    const fetchData = async () => {
      const { data: placeData } = await supabase
        .from('places')
        .select('*')
        .ilike('commune', `%${communeName}%`)
        .order('created_at', { ascending: false });

      const { data: eventData } = await supabase
        .from('events')
        .select('*')
        .ilike('commune', `%${communeName}%`)
        .order('event_date', { ascending: true });

      setPlaces(placeData || []);
      setEvents(eventData || []);
    };

    fetchData();
  }, [communeName]);

  useEffect(() => {
    if (!mapContainer.current) return;

    if (map.current) {
      map.current.flyTo({
        center: [communeInfo.lng, communeInfo.lat],
        zoom: communeInfo.zoom,
        essential: true
      });
    } else {
      map.current = new maplibregl.Map({
        container: mapContainer.current,
        style: 'https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json',
        center: [communeInfo.lng, communeInfo.lat],
        zoom: communeInfo.zoom,
        pitch: 35
      });

      map.current.addControl(new maplibregl.NavigationControl(), 'top-right');
    }

    // Add map markers for verified places
    places.forEach((p) => {
      const lat = p.lat ? parseFloat(p.lat) : communeInfo.lat;
      const lng = p.lng ? parseFloat(p.lng) : communeInfo.lng;

      const el = document.createElement('div');
      el.style.backgroundColor = '#2563eb';
      el.style.color = '#ffffff';
      el.style.padding = '4px 8px';
      el.style.borderRadius = '12px';
      el.style.fontSize = '10px';
      el.style.fontWeight = 'bold';
      el.style.border = '2px solid #38bdf8';
      el.style.boxShadow = '0 0 8px rgba(56, 189, 248, 0.6)';
      el.innerText = `📍 ${p.name}`;

      const popup = new maplibregl.Popup({ offset: 20 }).setHTML(`
        <div style="color: #0f172a; font-family: system-ui; padding: 4px;">
          <h4 style="margin:0 0 4px 0; font-weight:800;">${p.name}</h4>
          <p style="margin:0; font-size:11px; color:#475569;">${p.description || ''}</p>
        </div>
      `);

      new maplibregl.Marker({ element: el })
        .setLngLat([lng, lat])
        .setPopup(popup)
        .addTo(map.current!);
    });

  }, [communeName, communeInfo, places]);

  const foodPlaces = places.filter(p => p.vertical === 'kin_food');
  const otherPlaces = places.filter(p => p.vertical === 'kin_places');
  const culturePlaces = places.filter(p => p.vertical === 'kin_culture');
  const stylePlaces = places.filter(p => p.vertical === 'kin_style');

  const renderPlaceCard = (p: any) => (
    <div key={p.id} style={{ backgroundColor: '#020617', border: '1px solid #1e293b', borderRadius: '10px', padding: '12px', marginBottom: '12px' }}>
      {p.image_url && (
        <img 
          src={p.image_url} 
          alt={p.name} 
          style={{ width: '100%', height: '140px', objectFit: 'cover', borderRadius: '8px', marginBottom: '8px', border: '1px solid #1e293b' }} 
        />
      )}
      <strong style={{ color: '#fff', fontSize: '14px', display: 'block', marginBottom: '2px' }}>
        {p.name} {p.budget ? `(${p.budget})` : ''}
      </strong>
      {p.address && <span style={{ fontSize: '11px', color: '#94a3b8', display: 'block', marginBottom: '4px' }}>{p.address}</span>}
      <p style={{ fontSize: '12px', color: '#cbd5e1', margin: '0 0 6px 0', lineHeight: '1.4' }}>{p.description}</p>
      {p.google_maps_url && (
        <a href={p.google_maps_url} target="_blank" rel="noopener noreferrer" style={{ fontSize: '11px', color: '#38bdf8', fontWeight: 'bold', textDecoration: 'none' }}>
          📍 Google Maps Itinéraire →
        </a>
      )}
    </div>
  );

  return (
    <main style={{ backgroundColor: '#020617', color: '#f8fafc', minHeight: '100vh', padding: '16px', fontFamily: 'system-ui, sans-serif' }}>
      
      {/* Global CSS for grid responsiveness */}
      <style jsx global>{`
        .commune-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 16px; }
        .main-layout { display: grid; grid-template-columns: minmax(0, 1fr) 380px; gap: 20px; max-width: 1650px; margin: 0 auto; }
        @media (max-width: 1024px) {
          .main-layout { grid-template-columns: 1fr; }
        }
      `}</style>

      {/* Top Header Navigation */}
      <nav style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', maxWidth: '1650px', margin: '0 auto 20px auto', borderBottom: '1px solid #1e293b', paddingBottom: '14px', flexWrap: 'wrap', gap: '10px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <Link href="/" style={{ backgroundColor: '#1e293b', color: '#38bdf8', border: '1px solid #334155', padding: '8px 14px', borderRadius: '8px', textDecoration: 'none', fontWeight: 'bold', fontSize: '12px' }}>
            🏠 Accueil
          </Link>
          <span style={{ color: '#64748b', fontSize: '12px' }}>/ Communes /</span>
          <h1 style={{ fontSize: '20px', fontWeight: '900', color: '#ffffff', margin: 0, textTransform: 'uppercase' }}>
            Commune de {communeName}
          </h1>
        </div>

        {/* Commune Selector Dropdown with ALL 24 COMMUNES */}
        <select 
          value={ALL_KINSHASA_COMMUNES.includes(communeName) ? communeName : ''} 
          onChange={(e) => router.push(`/commune/${encodeURIComponent(e.target.value)}`)}
          style={{ backgroundColor: '#0f172a', border: '1px solid #38bdf8', color: '#fff', padding: '8px 12px', borderRadius: '8px', fontSize: '12px', fontWeight: 'bold', cursor: 'pointer' }}
        >
          <option value="" disabled>📍 Choisir une commune (24)...</option>
          {ALL_KINSHASA_COMMUNES.map(c => (
            <option key={c} value={c}>📍 Commune de {c}</option>
          ))}
        </select>
      </nav>

      {/* Main Grid: Content Column + Map Sidebar */}
      <div className="main-layout">
        
        {/* Left Column: Briefs & Vertical Listings */}
        <div>
          
          {/* Banner Tagline & Header */}
          <div style={{ backgroundColor: '#0f172a', border: '1px solid #2563eb', borderRadius: '14px', padding: '20px', marginBottom: '20px' }}>
            <span style={{ backgroundColor: '#2563eb', color: '#fff', fontSize: '10px', fontWeight: 'bold', padding: '3px 8px', borderRadius: '4px', textTransform: 'uppercase', letterSpacing: '1px' }}>
              Fiche Officielle Kinshasa Label
            </span>
            <h1 style={{ fontSize: '26px', fontWeight: '900', color: '#ffffff', margin: '8px 0 4px 0', textTransform: 'uppercase' }}>
              Le Meilleur de {communeName}
            </h1>
            <p style={{ fontSize: '15px', color: '#38bdf8', fontWeight: 'bold', margin: 0, fontStyle: 'italic' }}>
              "{communeInfo.tagline}"
            </p>
          </div>

          {/* 3 Encyclopedic Brief Pillars: Spécificité, Histoire, Économie */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', marginBottom: '20px' }}>
            
            {/* Spécificités */}
            <div style={{ backgroundColor: '#0f172a', border: '1px solid #1e293b', borderRadius: '12px', padding: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                <span style={{ fontSize: '18px' }}>✨</span>
                <h2 style={{ fontSize: '14px', fontWeight: 'bold', color: '#ffffff', margin: 0, textTransform: 'uppercase' }}>
                  Spécificités & Identité
                </h2>
              </div>
              <p style={{ fontSize: '13px', color: '#cbd5e1', lineHeight: '1.6', margin: 0 }}>
                {communeInfo.specification}
              </p>
            </div>

            {/* Histoire */}
            <div style={{ backgroundColor: '#0f172a', border: '1px solid #1e293b', borderRadius: '12px', padding: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                <span style={{ fontSize: '18px' }}>🏛️</span>
                <h2 style={{ fontSize: '14px', fontWeight: 'bold', color: '#ffffff', margin: 0, textTransform: 'uppercase' }}>
                  Aperçu Historique
                </h2>
              </div>
              <p style={{ fontSize: '13px', color: '#cbd5e1', lineHeight: '1.6', margin: 0 }}>
                {communeInfo.history}
              </p>
            </div>

            {/* Économie */}
            <div style={{ backgroundColor: '#0f172a', border: '1px solid #1e293b', borderRadius: '12px', padding: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                <span style={{ fontSize: '18px' }}>💼</span>
                <h2 style={{ fontSize: '14px', fontWeight: 'bold', color: '#ffffff', margin: 0, textTransform: 'uppercase' }}>
                  Économie & Activités
                </h2>
              </div>
              <p style={{ fontSize: '13px', color: '#cbd5e1', lineHeight: '1.6', margin: 0 }}>
                {communeInfo.economy}
              </p>
            </div>

          </div>

          {/* Quartiers Phares Badges */}
          <div style={{ backgroundColor: '#0f172a', border: '1px solid #1e293b', borderRadius: '12px', padding: '14px', marginBottom: '20px' }}>
            <h3 style={{ fontSize: '11px', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '1px', marginTop: 0, marginBottom: '8px' }}>
              📍 Quartiers & Repères Clés :
            </h3>
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
              {communeInfo.keyDistricts.map(d => (
                <span key={d} style={{ backgroundColor: '#1e293b', color: '#38bdf8', border: '1px solid #334155', padding: '4px 10px', borderRadius: '20px', fontSize: '11px', fontWeight: 'bold' }}>
                  • {d}
                </span>
              ))}
            </div>
          </div>

          {/* KIN WEEKEND HIGHLIGHT */}
          <section style={{ backgroundColor: '#0f172a', border: '1px solid #a855f7', borderRadius: '14px', padding: '18px', marginBottom: '20px' }}>
            <h2 style={{ fontSize: '16px', fontWeight: 'bold', color: '#a855f7', margin: '0 0 12px 0', textTransform: 'uppercase' }}>
              🎉 KIN WEEKEND — À faire ce weekend à {communeName} ({events.length})
            </h2>
            <div className="commune-grid">
              {events.length === 0 ? (
                <p style={{ fontSize: '11px', color: '#64748b' }}>Aucun événement ce weekend dans cette commune.</p>
              ) : (
                events.map(e => (
                  <div key={e.id} style={{ backgroundColor: '#020617', border: '1px solid #1e293b', borderRadius: '8px', padding: '12px' }}>
                    <span style={{ fontSize: '9px', color: '#a855f7', fontWeight: 'bold', textTransform: 'uppercase' }}>{e.category} ● {e.event_date}</span>
                    <h3 style={{ fontSize: '14px', color: '#fff', margin: '4px 0' }}>{e.title}</h3>
                    <p style={{ fontSize: '11px', color: '#cbd5e1', margin: 0 }}>{e.description}</p>
                  </div>
                ))
              )}
            </div>
          </section>

          {/* 4 VERTICAL CARDS */}
          <div className="commune-grid">
            <section style={{ backgroundColor: '#0f172a', border: '1px solid #1e293b', borderRadius: '14px', padding: '18px' }}>
              <h2 style={{ fontSize: '15px', color: '#22c55e', margin: '0 0 12px 0', textTransform: 'uppercase', fontWeight: 'bold' }}>
                🍔 KIN FOOD ({foodPlaces.length})
              </h2>
              {foodPlaces.length === 0 ? <p style={{ fontSize: '11px', color: '#64748b' }}>Aucune adresse pour le moment.</p> : foodPlaces.map(renderPlaceCard)}
            </section>

            <section style={{ backgroundColor: '#0f172a', border: '1px solid #1e293b', borderRadius: '14px', padding: '18px' }}>
              <h2 style={{ fontSize: '15px', color: '#38bdf8', margin: '0 0 12px 0', textTransform: 'uppercase', fontWeight: 'bold' }}>
                📍 KIN PLACES ({otherPlaces.length})
              </h2>
              {otherPlaces.length === 0 ? <p style={{ fontSize: '11px', color: '#64748b' }}>Aucun lieu répertorié.</p> : otherPlaces.map(renderPlaceCard)}
            </section>

            <section style={{ backgroundColor: '#0f172a', border: '1px solid #1e293b', borderRadius: '14px', padding: '18px' }}>
              <h2 style={{ fontSize: '15px', color: '#f59e0b', margin: '0 0 12px 0', textTransform: 'uppercase', fontWeight: 'bold' }}>
                🎨 KIN CULTURE ({culturePlaces.length})
              </h2>
              {culturePlaces.length === 0 ? <p style={{ fontSize: '11px', color: '#64748b' }}>Aucun espace culturel.</p> : culturePlaces.map(renderPlaceCard)}
            </section>

            <section style={{ backgroundColor: '#0f172a', border: '1px solid #1e293b', borderRadius: '14px', padding: '18px' }}>
              <h2 style={{ fontSize: '15px', color: '#ec4899', margin: '0 0 12px 0', textTransform: 'uppercase', fontWeight: 'bold' }}>
                👗 KIN STYLE ({stylePlaces.length})
              </h2>
              {stylePlaces.length === 0 ? <p style={{ fontSize: '11px', color: '#64748b' }}>Aucune adresse mode.</p> : stylePlaces.map(renderPlaceCard)}
            </section>
          </div>

        </div>

        {/* Sidebar Interactive Map */}
        <aside>
          <div style={{ position: 'sticky', top: '16px', backgroundColor: '#0f172a', border: '1px solid #1e293b', borderRadius: '14px', padding: '14px' }}>
            <h3 style={{ fontSize: '12px', color: '#38bdf8', textTransform: 'uppercase', fontWeight: 'bold', marginTop: 0, marginBottom: '10px' }}>
              🗺️ Carte Interactive de {communeName}
            </h3>
            <div ref={mapContainer} style={{ width: '100%', height: '440px', borderRadius: '10px', overflow: 'hidden' }} />
            <p style={{ fontSize: '10px', color: '#64748b', marginTop: '8px', marginBottom: 0, textAlign: 'center' }}>
              {places.length} lieu(x) certifié(s) géolocalisé(s)
            </p>
          </div>
        </aside>

      </div>
    </main>
  );
}
