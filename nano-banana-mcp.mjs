import fs from "node:fs";
import path from "node:path";
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  ListToolsRequestSchema,
  CallToolRequestSchema
} from "@modelcontextprotocol/sdk/types.js";

const API_KEY = process.env.GEMINI_API_KEY;

if (!API_KEY) {
  console.error("Missing GEMINI_API_KEY");
  process.exit(1);
}

const server = new Server(
  {
    name: "nano-banana",
    version: "1.0.0"
  },
  {
    capabilities: {
      tools: {}
    }
  }
);

server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: [
      {
        name: "generate_image",
        description: "Generate a kid-friendly game image asset",
        inputSchema: {
          type: "object",
          properties: {
            prompt: { type: "string" },
            filename: { type: "string" }
          },
          required: ["prompt"]
        }
      }
    ]
  };
});

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  if (request.params.name !== "generate_image") {
    throw new Error(`Unknown tool: ${request.params.name}`);
  }

  const args = request.params.arguments ?? {};
  const prompt = typeof args.prompt === "string" ? args.prompt : "";
  const filename =
    typeof args.filename === "string" && args.filename.trim()
      ? args.filename.trim()
      : `asset-${Date.now()}.png`;

  if (!prompt) {
    return {
      content: [{ type: "text", text: "Missing prompt" }],
      isError: true
    };
  }

  const res = await fetch(
    "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-image:generateContent",
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-goog-api-key": API_KEY
      },
      body: JSON.stringify({
        contents: [
          {
            parts: [{ text: prompt }]
          }
        ]
      })
    }
  );

  if (!res.ok) {
    const text = await res.text();
    return {
      content: [{ type: "text", text: `Gemini API error: ${res.status} ${text}` }],
      isError: true
    };
  }

  const data = await res.json();

  const imagePart = data?.candidates?.[0]?.content?.parts?.find(
    (p) => p?.inlineData?.data
  );

  if (!imagePart) {
    return {
      content: [{ type: "text", text: "No image data returned from Gemini" }],
      isError: true
    };
  }

  const assetsDir = path.resolve("assets");
  fs.mkdirSync(assetsDir, { recursive: true });

  const outputPath = path.join(assetsDir, filename);
  const buffer = Buffer.from(imagePart.inlineData.data, "base64");
  fs.writeFileSync(outputPath, buffer);

  return {
    content: [{ type: "text", text: outputPath }]
  };
});

const transport = new StdioServerTransport();
await server.connect(transport);