export type RegisterDemoAsset = {
  id: string;
  cardLabel: string;
  setName: string;
  certNumber: string;
  grade: 10;
  gradeLabel: "GEM MT";
  imageUrl: string;
  sourceUrl: string;
};

export const REGISTER_DEMO_ASSETS: RegisterDemoAsset[] = [
  {
    id: "radiant-charizard",
    cardLabel: "2022 Pokemon GO Japanese #011 Radiant Charizard",
    setName: "Pokemon GO Japanese",
    certNumber: "66981342",
    grade: 10,
    gradeLabel: "GEM MT",
    imageUrl: "/demo-register-assets/psa-radiant-charizard-real.jpg",
    sourceUrl: "https://pokedex.in/products/psa-10-pokemon-radiant-charizard-holo-s10b-japanese-graded-slab",
  },
  {
    id: "blastoise-classic",
    cardLabel: "2021 Pokemon Classic Collection Japanese #003 Blastoise",
    setName: "Classic Collection Japanese",
    certNumber: "88325052",
    grade: 10,
    gradeLabel: "GEM MT",
    imageUrl: "/demo-register-assets/psa-blastoise-classic-real.jpg",
    sourceUrl: "https://pokedex.in/products/psa-10-pokemon-blastoise-classic-collection-japanese-graded-slab",
  },
  {
    id: "mewtwo-ex",
    cardLabel: "2021 Pokemon Japanese #022 Mewtwo EX 25th Anniversary",
    setName: "25th Anniversary Japanese",
    certNumber: "72348032",
    grade: 10,
    gradeLabel: "GEM MT",
    imageUrl: "/demo-register-assets/psa-mewtwo-ex-real.jpg",
    sourceUrl: "https://pokedex.in/products/psa-10-pokemon-mewtwo-ex-japanese-022-025-graded-card-slab",
  },
  {
    id: "gengar-vmax",
    cardLabel: "2021 Pokemon SWSH Fusion Strike #157 Gengar VMAX",
    setName: "Fusion Strike",
    certNumber: "131778560",
    grade: 10,
    gradeLabel: "GEM MT",
    imageUrl: "/demo-register-assets/psa-gengar-vmax-real.jpg",
    sourceUrl: "https://www.poke-gallery.com/en/products/pokemon-karte-gengar-vmax-fst-157-psa-10-fusion-strike-englisch",
  },
];
