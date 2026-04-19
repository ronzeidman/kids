import fs from "node:fs";
import path from "node:path";

const API_KEY = process.env.GEMINI_API_KEY;
const OUT = "/Volumes/KINGSTON/kids/games/jumping-dinasour/assets";

async function generate(prompt, filename) {
  console.log(`Generating ${filename}...`);
  const res = await fetch(
    "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-image:generateContent",
    {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-goog-api-key": API_KEY },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { responseModalities: ["IMAGE", "TEXT"] }
      })
    }
  );
  const data = await res.json();
  if (!res.ok) { console.error("Error:", JSON.stringify(data)); return; }

  const imagePart = data?.candidates?.[0]?.content?.parts?.find(p => p?.inlineData?.data);
  if (!imagePart) { console.error("No image for", filename, JSON.stringify(data).slice(0,300)); return; }

  const outPath = path.join(OUT, filename);
  fs.writeFileSync(outPath, Buffer.from(imagePart.inlineData.data, "base64"));
  console.log("Saved:", outPath);
}

await generate(
  "A cute cartoon dinosaur facing RIGHT, pixel art game sprite, bright green, big eyes, NO background, fully transparent background, isolated character only, PNG with alpha channel",
  "dino.png"
);

await generate(
  "A shiny golden key, pixel art game icon, bright gold color, NO background, fully transparent background, isolated object only, PNG with alpha channel",
  "key.png"
);

await generate(
  "A colorful checkered finish flag on a pole, pixel art game icon, NO background, fully transparent background, isolated object only, PNG with alpha channel",
  "flag.png"
);

console.log("Done!");
