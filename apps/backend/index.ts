import express from "express";
import dotenv from "dotenv";
import { ChatOpenAI , OpenAIEmbeddings } from "@langchain/openai";
import { initPinecone } from "./src/pinecone";

dotenv.config();
const app = express();
app.use(express.json());

const openai = new ChatOpenAI ({
  apiKey: process.env.OPENAI_API_KEY!,
  modelName: "gpt-4-turbo",
});


const embeddings = new OpenAIEmbeddings({
  apiKey: process.env.OPENAI_API_KEY!, // In Node.js defaults to process.env.OPENAI_API_KEY
  batchSize: 512, // Default value if omitted is 512. Max is 2048
  model: "text-embedding-ada-002",
});

let pineconeClient: any;
initPinecone().then((client: any) => {
  pineconeClient = client;
  console.log("Pinecone client initialized successfully");
}).catch(error => {
  console.error("Failed to initialize Pinecone client:", error);
});

app.post("/embed", async (req, res) => {
  try {
    //const { text, id } = req.body;
    const text="Hello how are you all i am fine"
    const virat="Virat Kohli, born on November 5, 1988, in Delhi, India, stands as one of cricket's most influential figures of the 21st century. His journey from a talented Delhi youngster to becoming India's most successful Test captain represents a remarkable story of dedication, skill development, and mental fortitude that has redefined excellence in modern cricket.Kohli's introduction to cricket came at the age of three, when he asked his father, Prem Kohli, for a bat. His formal training began at the West Delhi Cricket Academy at age nine under coach Rajkumar Sharma, who quickly recognized the child's exceptional talent. Tragedy struck Kohli's life when his father passed away in December 2006 due to a stroke. Despite this devastating loss, the eighteen-year-old Kohli displayed remarkable resilience by returning to complete a match for Delhi against Karnataka the day after his father's funeral, scoring 90 runs. This early demonstration of mental strength would become a defining characteristic throughout his career.Kohli's leadership abilities emerged early when he captained India to victory in the 2008 U-19 Cricket World Cup in Malaysia. His performances caught the attention of the Royal Challengers Bangalore, who signed him for the inaugural Indian Premier League season. His international debut came shortly after in August 2008 during an ODI series against Sri Lanka. Though his early international performances were promising but inconsistent, Kohli's breakthrough moment arrived during the 2011 ICC Cricket World Cup, where he played crucial innings including an important 83 in the final against Sri Lanka, helping India secure their second World Cup title."

    const id="1234"
    if (!text || !id) return res.status(400).json({ error: "Text & ID required" });

    const vector = await embeddings.embedQuery(virat);
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


app.post("/chat", async (req, res) => {
  try {
    //const { query } = req.body;
    const query="who is virat kohli"
    if (!query) return res.status(400).json({ error: "Query is required" });

    // Check if Pinecone client is initialized
    if (!pineconeClient) {
      return res.status(503).json({ error: "Database not yet initialized" });
    }

    const vector = await embeddings.embedQuery(query);
    const index = pineconeClient.Index(process.env.PINECONE_INDEX!);

    const queryResponse = await index.query({
      vector,
      topK: 3,
      includeMetadata: true,
    });

    // Check if matches were found
    if (!queryResponse.matches || queryResponse.matches.length === 0) {
      return res.json({ 
        response: "I don't have enough information to answer that question." 
      });
    }

    // Extract text from metadata
    const relevantChunks = queryResponse.matches
      .filter((match: any) => match.metadata && match.metadata.text)
      .map((match: any) => match.metadata.text)
      .join("\n");

    // Use the correct format for calling the chat model
    const aiResponse = await openai.invoke([
      { role: "system", content: "You are Documentation assistant. Answer based on the context provided." },
      { role: "user", content: `Based on the following context:\n\n${relevantChunks}\n\nAnswer the query: ${query}` }
    ]);

    res.json({ response: aiResponse.content });
  } catch (error) {
    console.error("Error processing chat:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

app.listen(8080, () => console.log("Server running on port 8080"));
