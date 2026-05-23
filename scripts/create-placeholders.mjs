import fs from "node:fs";
import sharp from "sharp";

fs.mkdirSync("public/products", { recursive: true });

const items = [
  ["hoodie", "Худи", "#2f8a4c"],
  ["tshirt", "Футболка", "#f7faf6"],
  ["notebook", "Ежедневник", "#2f8a4c"],
  ["pen", "Ручка", "#426d9c"],
  ["bottle", "Бутылка", "#2f8a4c"],
  ["bag", "Шоппер", "#efe7d5"],
  ["coffee", "Кофе", "#7b5131"],
  ["candle", "Свеча", "#f0e1dc"]
];

await Promise.all(
  items.map(([id, title, color]) => {
    const svg = `
      <svg xmlns="http://www.w3.org/2000/svg" width="1200" height="1200" viewBox="0 0 1200 1200">
        <rect width="1200" height="1200" fill="none"/>
        <ellipse cx="600" cy="910" rx="285" ry="42" fill="rgba(30,60,45,.12)"/>
        <path d="M390 330c70-90 350-90 420 0l80 430c14 75-42 140-118 140H428c-76 0-132-65-118-140l80-430Z" fill="${color}" stroke="#1d5f35" stroke-width="18"/>
        <circle cx="600" cy="565" r="150" fill="rgba(255,255,255,.76)"/>
        <text x="600" y="585" text-anchor="middle" font-family="Arial, sans-serif" font-size="66" font-weight="700" fill="#1d5f35">${title}</text>
      </svg>
    `;
    return sharp(Buffer.from(svg)).png().toFile(`public/products/${id}.png`);
  })
);

console.log("Изображения-заглушки созданы.");
