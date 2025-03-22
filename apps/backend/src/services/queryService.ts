// src/services/queryService.ts
import { OpenAIEmbeddings } from "@langchain/openai";
import { ChatOpenAI } from "@langchain/openai";


export class QueryService {
    private embeddings: OpenAIEmbeddings;
    private openai: ChatOpenAI;
    private pineconeClient: any;
    private indexName: string;

    constructor(pineconeClient: any) {
        // Initialize OpenAI embeddings
        this.embeddings = new OpenAIEmbeddings({
            apiKey: process.env.OPENAI_API_KEY!,
            batchSize: 512,
            modelName: "text-embedding-ada-002",
        });

        // Initialize OpenAI chat model
        this.openai = new ChatOpenAI({
            apiKey: process.env.OPENAI_API_KEY!,
            modelName: "gpt-4-turbo",
        });

        this.pineconeClient = pineconeClient;
        this.indexName = process.env.PINECONE_INDEX!;
    }

    /**
     * Generate embeddings for a text query and search the vector database
     */
    async queryEmbeddings(text: string, topK: number = 5): Promise<any> {
        if (!this.pineconeClient) {
            throw new Error("Database not yet initialized");
        }

        const vector = await this.embeddings.embedQuery(text);
        const index = this.pineconeClient.Index(this.indexName).namespace("pdfchatbot"); //napespace to be deofned is imp here for searching purposes

        const queryResponse = await index.query({
            vector,
            topK,
            includeMetadata: true,
        });

        return queryResponse.matches || [];
    }

    /**
     * Process a chat query by retrieving context and generating a response
     */
    async processChat(query: string): Promise<string> {
        // Get relevant context from vector database
        const matches = await this.queryEmbeddings(query, 5);

        // Check if matches were found
        if (!matches || matches.length === 0) {
            return "I don't have enough information to answer that question.";
        }

        // Extract text from metadata
        const relevantChunks = matches
            .filter((match: any) => match.metadata && match.metadata.text)
            .map((match: any) => match.metadata.text)
            .join("\n\n");

        // Prepare a detailed system prompt for better responses
        const systemPrompt = `
You are a helpful assistant that answers questions based on the user's documents.

Guidelines:
- Answer based ONLY on the provided context
- If the context doesn't contain the answer, say "I don't have specific information about that in our knowledge base"
- Keep answers concise and focused
- Use a professional, friendly tone
- Prioritize accuracy over speculation
- Format responses for readability when appropriate
- Cite specific policies or procedures when available in the context
`;

        // Use the correct format for calling the chat model
        const aiResponse = await this.openai.invoke([
            { role: "system", content: systemPrompt },
            { role: "user", content: `Context Information:\n\n${relevantChunks}\n\nUser Question: ${query}\n\nProvide a clear, direct answer based only on the context above.` }
        ]);

        return aiResponse.content as string;
    }
}