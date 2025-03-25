import { OpenAIEmbeddings } from "@langchain/openai";
import { ChatOpenAI } from "@langchain/openai";
import { type Response } from "express";

export class QueryService {
    //private embeddings: OpenAIEmbeddings;
    // private openai: ChatOpenAI;
    // private streamingOpenai: ChatOpenAI;
    private pineconeClient: any;
    private indexName: string;

    constructor(pineconeClient: any) {
        // Initialize OpenAI embeddings
        // this.embeddings = new OpenAIEmbeddings({
        //     apiKey: process.env.OPENAI_API_KEY!,
        //     batchSize: 512,
        //     modelName: "text-embedding-ada-002",
        // });

        // Initialize OpenAI chat model (non-streaming)
        // this.openai = new ChatOpenAI({
        //     apiKey: process.env.OPENAI_API_KEY!,
        //     modelName: "gpt-4-turbo",
        // });

        // Initialize OpenAI chat model (streaming)
        // this.streamingOpenai = new ChatOpenAI({
        //     apiKey: process.env.OPENAI_API_KEY!,
        //     modelName: "gpt-4-turbo",
        //     streaming: true,
        // });

        this.pineconeClient = pineconeClient;
        this.indexName = process.env.PINECONE_INDEX!;
    }

    /**
     * Generate embeddings for a text query and search the vector database
     */
    async queryEmbeddings(text: string, userOpenAIKey:string,topK: number = 5,userId:string =""): Promise<any> {
        if (!this.pineconeClient) {
            throw new Error("Database not yet initialized");
        }
        const embeddings=new OpenAIEmbeddings({
                apiKey: userOpenAIKey!,
                batchSize: 512,
                modelName: "text-embedding-ada-002",
        });
        const vector = await embeddings.embedQuery(text);
        const index = this.pineconeClient.Index(this.indexName);
        const namespace = index.namespace(userId); // Namespace for searching in vector databases for the namespaces

        const queryResponse = await namespace.query({
            vector,
            topK,
            includeMetadata: true,
        });

        return queryResponse.matches || [];
    }

    /**
     * Process a chat query by retrieving context and generating a response (non-streaming)
     */
    async processChat(query: string,userOpenAIKey:string): Promise<string> {
        // Get relevant context from vector database
        const matches = await this.queryEmbeddings(query, userOpenAIKey,5);

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
        const systemPrompt = this.getSystemPrompt();

        // Use the correct format for calling the chat model
        const openai=new ChatOpenAI({
                apiKey: userOpenAIKey,
                modelName: "gpt-4-turbo",
        });
        const aiResponse = await openai.invoke([
            { role: "system", content: systemPrompt },
            { role: "user", content: `Context Information:\n\n${relevantChunks}\n\nUser Question: ${query}\n\nProvide a clear, direct answer based only on the context above.` }
        ]);

        return aiResponse.content as string;
    }

    /**
     * Process a chat query with streaming response
     */
    async processChatStream(query: string, res: Response,userOpenAIKey:string,userId:string): Promise<void> {
        try {
            // Send status update
            //res.write(`data: ${JSON.stringify({ type: 'status', content: 'Searching for relevant information...' })}\n\n`);

            // Get relevant context from vector database
            const matches = await this.queryEmbeddings(query,userOpenAIKey,5,userId);

            // Check if matches were found
            if (!matches || matches.length === 0) {
                res.write(`data: ${JSON.stringify({
                    type: 'content',
                    content: "I don't have enough information to answer that question."
                })}\n\n`);
                return;
            }

            // Extract text from metadata
            const relevantChunks = matches
                .filter((match: any) => match.metadata && match.metadata.text)
                .map((match: any) => match.metadata.text)
                .join("\n\n");

            // Send status update
            res.write(`data: ${JSON.stringify({
                type: 'status',
                content: 'Found relevant information. Generating response...'
            })}\n\n`);

            // Prepare system prompt
            const systemPrompt = this.getSystemPrompt();

            // Use the streaming version of the chat model
            const userMessage = `Context Information:\n\n${relevantChunks}\n\nUser Question: ${query}\n\nProvide a clear, direct answer based only on the context above.`;

            let responseText = '';

            // Stream the response
            const streamingOpenai=new ChatOpenAI({
                    apiKey: userOpenAIKey,
                    modelName: "gpt-4-turbo",
                    streaming: true,
            });
            await streamingOpenai.invoke(
                [
                    { role: "system", content: systemPrompt },
                    { role: "user", content: userMessage }
                ],
                {
                    callbacks: [
                        {
                            handleLLMNewToken(token: string) {
                                responseText += token;
                                res.write(`data: ${JSON.stringify({ type: 'token', content: token })}\n\n`);
                            },
                        },
                    ],
                }
            );

            // Send the full response at the end as well (can be useful for client-side processing)
            res.write(`data: ${JSON.stringify({ type: 'fullContent', content: responseText })}\n\n`);

        } catch (error: any) {
            console.error("Error in streaming chat:", error);
            res.write(`data: ${JSON.stringify({ type: 'error', content: error.message })}\n\n`);
        }
    }

    /**
     * Get the system prompt for better responses
     */
    private getSystemPrompt(): string {
        return `
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
    }
}