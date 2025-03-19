import express from "express";
import dotenv from "dotenv";
import { OpenAIEmbeddings } from "@langchain/openai";
import { initPinecone } from "./src/pinecone";

dotenv.config();
const app = express();
app.use(express.json());

const embeddings = new OpenAIEmbeddings({
  apiKey: process.env.OPENAI_API_KEY!, // In Node.js defaults to process.env.OPENAI_API_KEY
  batchSize: 512, // Default value if omitted is 512. Max is 2048
  model: "text-embedding-ada-002",
});

let pineconeClient: any;
initPinecone().then((client:any) => (pineconeClient = client));

app.post("/embed", async (req, res) => {
  try {
    //const { text, id } = req.body;
    const text="Hello how are you all i am fine"
    const id="1234"
    if (!text || !id) return res.status(400).json({ error: "Text & ID required" });

    const vector = await embeddings.embedQuery(text);
    const index = pineconeClient.Index(process.env.PINECONE_INDEX!);

    await index.upsert([{ id, values: vector }]);

    res.json({ message: "Embedding stored successfully", id });
  } catch (error) {
    console.error("Error embedding text:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

app.post("/query", async (_, res) => {
  try {
    const text = "Hello";
    const topK = 3;

    const vector = await embeddings.embedQuery(text);
    const index = pineconeClient.Index(process.env.PINECONE_INDEX!);

    const queryResponse = await index.query({
      vector,
      topK,
      includeMetadata: true,
    });

    res.json({ results: queryResponse.matches });
  } catch (error) {
    console.error("Error querying embeddings:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

app.listen(8080, () => console.log("Server running on port 8080"));
