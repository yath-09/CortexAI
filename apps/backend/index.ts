// import express from "express"
// import cors from 'cors';
// import helmet from 'helmet';
// import dotenv from 'dotenv';
// import {prismaClient} from "db"
// import router from "./src/routes/embedding.routes";

// dotenv.config()
// const PORT=process.env.PORT || 8080;


// const app=express()

// app.get("/",(req,res)=>{
//     res.send(
//         'Healthy server 8080'
//     )
// })

// app.use(cors());
// app.use(helmet());
// app.use(express.json({ limit: '10mb' }));
// app.use(express.urlencoded({ extended: true, limit: '10mb' }));


// app.use('/api/embeddings',router);

// // Error handling middleware
// app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
//   console.error('Unhandled error:', err);
//   res.status(500).json({
//     success: false,
//     message: 'Internal server error',
//     error: process.env.NODE_ENV === 'production' ? undefined : err.message
//   });
// });

// // Start server
// async function startServer() {
//   try {
//     // Connect to the database
//     await prismaClient.$connect();
//     console.log('Connected to database successfully');
    
//     // Start the server
//     app.listen(PORT, () => {
//       console.log(`Server running on port ${PORT}`);
//     });
//   } catch (error) {
//     console.error('Failed to start server:', error);
//     process.exit(1);
//   }
// }

// startServer();

// // Handle graceful shutdown
// process.on('SIGINT', async () => {
//   await prismaClient.$disconnect();
//   console.log('Database connection closed');
//   process.exit(0);
// });

// process.on('SIGTERM', async () => {
//   await prismaClient.$disconnect();
//   console.log('Database connection closed');
//   process.exit(0);
// });


import express from "express";
import dotenv from "dotenv";
import { OpenAIEmbeddings } from "langchain/embeddings/openai";
import OpenAI from "openai";
import { initPinecone } from "./src/pinecone";

dotenv.config();
const app = express();
app.use(express.json());



const embeddings = new OpenAIEmbeddings({
  openAIApiKey: process.env.OPENAI_API_KEY!,
});

let pineconeClient: any;
initPinecone().then((client:any) => (pineconeClient = client));

app.post("/embed", async (req, res) => {
  try {
    //const { text, id } = req.body;
    const text="Hello"
    const id=123
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

app.listen(3000, () => console.log("Server running on port 3000"));
