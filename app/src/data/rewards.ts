// Premios canjeables por puntos (cenas en familia). Los precios salen de esta regla de puntos:
//   sesión completada = 10 pts × multiplicador de racha (+10% por cada 5 días de racha, máx ×2),
//   semana completa 5/5 = +25 pts, y +10 pts por sesión cuando los dos entrenan el mismo día.
// Entrenando perfecto con el bonus de equipo, una persona acumula ≈ 126 / 257 / 393 / 534 pts
// al terminar la semana 1 / 2 / 3 / 4. Las comidas básicas cuestan 2 semanas continuas (≈250 pts)
// y el hot pot, que se paga entre los dos, un mes continuo de ambos (≈1,100 pts combinados).

export type Reward = {
  id: string;
  name: string;
  cost: number;
  image: string;
  /** los dos pueden juntar sus puntos para pagarlo */
  pooled?: boolean;
};

export const REWARDS: Reward[] = [
  { id: "orinoco", name: "Orinoco", cost: 250, image: "/rewards/orinoco.jpg" },
  { id: "la-bourgeoisie", name: "La Bourgeoisie", cost: 250, image: "/rewards/la-bourgeoisie.jpg" },
  { id: "traficante-de-pizza", name: "Traficante de Pizza", cost: 300, image: "/rewards/traficante-de-pizza.jpg" },
  { id: "mataleon", name: "Hamburguesas Mataleón", cost: 325, image: "/rewards/mataleon.jpg" },
  { id: "bobo-burgers", name: "Bobo Burgers", cost: 400, image: "/rewards/bobo-burgers.jpg" },
  { id: "deigo-ramen", name: "Deigo Ramen", cost: 475, image: "/rewards/deigo-ramen.jpg" },
  { id: "hot-pot", name: "Hot Pot", cost: 1100, image: "/rewards/hot-pot.jpg", pooled: true },
];
