export interface MenuItem {
  id: string;
  name: string;
  price: number;
  description: string;
  category: "appetizers" | "mains" | "drinks" | "desserts";
  modifications: string[];
}

export const menu: MenuItem[] = [
  // Appetizers
  {
    id: "edamame",
    name: "Edamame",
    price: 5.5,
    description: "Steamed soybeans with sea salt",
    category: "appetizers",
    modifications: ["extra salt", "spicy chili flakes"],
  },
  {
    id: "spring-rolls",
    name: "Vegetable Spring Rolls",
    price: 7.0,
    description: "Crispy rolls with mixed vegetables and sweet chili sauce",
    category: "appetizers",
    modifications: ["extra sauce", "no sauce"],
  },
  {
    id: "miso-soup",
    name: "Miso Soup",
    price: 4.5,
    description: "Traditional miso with tofu, wakame, and scallions",
    category: "appetizers",
    modifications: ["extra tofu", "no scallions"],
  },
  {
    id: "gyoza",
    name: "Pan-Fried Gyoza",
    price: 8.0,
    description: "Six pork and cabbage dumplings with ponzu dipping sauce",
    category: "appetizers",
    modifications: ["steamed instead", "vegetable filling"],
  },

  // Mains
  {
    id: "teriyaki-salmon",
    name: "Teriyaki Salmon",
    price: 18.5,
    description: "Grilled Atlantic salmon with teriyaki glaze, rice, and vegetables",
    category: "mains",
    modifications: ["extra rice", "brown rice", "no vegetables", "extra glaze"],
  },
  {
    id: "ramen",
    name: "Tonkotsu Ramen",
    price: 15.0,
    description: "Rich pork bone broth with chashu, soft egg, nori, and noodles",
    category: "mains",
    modifications: ["extra chashu", "extra egg", "spicy", "no nori"],
  },
  {
    id: "chicken-katsu",
    name: "Chicken Katsu Curry",
    price: 16.0,
    description: "Crispy breaded chicken with Japanese curry sauce and rice",
    category: "mains",
    modifications: ["extra curry", "spicy curry", "brown rice"],
  },
  {
    id: "pad-thai",
    name: "Pad Thai",
    price: 14.5,
    description: "Stir-fried rice noodles with shrimp, peanuts, and lime",
    category: "mains",
    modifications: ["no peanuts", "extra shrimp", "tofu instead", "extra spicy"],
  },
  {
    id: "bibimbap",
    name: "Bibimbap",
    price: 15.5,
    description: "Korean rice bowl with vegetables, beef, gochujang, and fried egg",
    category: "mains",
    modifications: ["no egg", "extra gochujang", "vegetarian"],
  },
  {
    id: "sushi-platter",
    name: "Chef's Sushi Platter",
    price: 24.0,
    description: "12 pieces of assorted nigiri and maki rolls",
    category: "mains",
    modifications: ["no wasabi", "extra ginger", "sashimi style"],
  },

  // Drinks
  {
    id: "green-tea",
    name: "Japanese Green Tea",
    price: 3.0,
    description: "Hot brewed sencha green tea",
    category: "drinks",
    modifications: ["iced", "with honey"],
  },
  {
    id: "thai-iced-tea",
    name: "Thai Iced Tea",
    price: 4.5,
    description: "Sweet black tea with condensed milk over ice",
    category: "drinks",
    modifications: ["less sweet", "no ice"],
  },
  {
    id: "yuzu-lemonade",
    name: "Yuzu Lemonade",
    price: 5.0,
    description: "Sparkling lemonade with yuzu citrus",
    category: "drinks",
    modifications: ["still", "extra yuzu"],
  },
  {
    id: "sake",
    name: "House Sake",
    price: 8.0,
    description: "Junmai sake, served warm or cold",
    category: "drinks",
    modifications: ["warm", "cold", "large"],
  },
  {
    id: "ramune",
    name: "Ramune Soda",
    price: 3.5,
    description: "Classic Japanese marble soda, original flavor",
    category: "drinks",
    modifications: ["strawberry", "melon", "grape"],
  },

  // Desserts
  {
    id: "mochi-ice-cream",
    name: "Mochi Ice Cream",
    price: 6.0,
    description: "Three pieces of mochi ice cream (matcha, strawberry, mango)",
    category: "desserts",
    modifications: ["all matcha", "all strawberry", "all mango"],
  },
  {
    id: "matcha-cheesecake",
    name: "Matcha Cheesecake",
    price: 7.5,
    description: "Japanese-style light and fluffy matcha cheesecake",
    category: "desserts",
    modifications: ["extra whipped cream", "with red bean"],
  },
  {
    id: "tempura-banana",
    name: "Tempura Banana",
    price: 6.5,
    description: "Crispy tempura-battered banana with chocolate drizzle",
    category: "desserts",
    modifications: ["with ice cream", "caramel drizzle instead"],
  },
];

export function findMenuItem(name: string): MenuItem | undefined {
  const lower = name.toLowerCase();
  return menu.find(
    (item) =>
      item.name.toLowerCase() === lower ||
      item.id === lower ||
      item.name.toLowerCase().includes(lower) ||
      lower.includes(item.name.toLowerCase())
  );
}

export function getMenuByCategory(): Record<string, MenuItem[]> {
  const grouped: Record<string, MenuItem[]> = {};
  for (const item of menu) {
    if (!grouped[item.category]) {
      grouped[item.category] = [];
    }
    grouped[item.category].push(item);
  }
  return grouped;
}

export function formatMenuForLLM(): string {
  const grouped = getMenuByCategory();
  let text = "";
  for (const [category, items] of Object.entries(grouped)) {
    text += `\n## ${category.charAt(0).toUpperCase() + category.slice(1)}\n`;
    for (const item of items) {
      text += `- ${item.name}: $${item.price.toFixed(2)} — ${item.description}`;
      if (item.modifications.length > 0) {
        text += ` (can modify: ${item.modifications.join(", ")})`;
      }
      text += "\n";
    }
  }
  return text;
}
