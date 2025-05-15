import { OpenAIEmbeddings } from "@langchain/openai";
import { ChatOpenAI } from "@langchain/openai";
import { prismaClient } from "db";
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
        //     modelName: "text-embedding-3-small",
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
    async queryEmbeddings(text: string, userOpenAIKey: string, topK: number = 5, userId: string = ""): Promise<any> {
        if (!this.pineconeClient) {
            throw new Error("Database not yet initialized");
        }
        const embeddings = new OpenAIEmbeddings({
            apiKey: userOpenAIKey!,
            batchSize: 512,
            modelName: "text-embedding-3-small",
        });
        const vector = await embeddings.embedQuery(text);
        const index = this.pineconeClient.Index(this.indexName);
        const university = await prismaClient.user.findFirst({
            where: {
                userId: userId,
            },
            select: {
                role: true,
                universityName: true,
            },
        })
        // const namespaceKey =
        //     university?.role === "admin" && university?.universityName
        //         ? `university-${university.universityName}`
        //         : userId;
        const namespace = index.namespace(`university-${university?.universityName}`); // Namespace for searching in vector databases for the namespaces

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
    async processChat(query: string, userOpenAIKey: string): Promise<string> {
        // Get relevant context from vector database
        const matches = await this.queryEmbeddings(query, userOpenAIKey, 5);

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
        const openai = new ChatOpenAI({
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
    async processChatStream(query: string, res: Response, userOpenAIKey: string, userId: string): Promise<void> {
        try {
            // Send status update
            //res.write(`data: ${JSON.stringify({ type: 'status', content: 'Searching for relevant information...' })}\n\n`);

            // Get relevant context from vector database
            const matches = await this.queryEmbeddings(query, userOpenAIKey, 10, userId);
            console.log("Generting response using vectors storage")
            // Check if matches were found
            // Check if matches were found

            //console.log(matches.length);
            if (!matches || matches.length === 0) {
                // Check for general/fallback queries
                const generalQueries = [
                    'hello',
                    'hi',
                    'who are you',
                    'what can you do',
                    'help',
                    'introduce yourself',
                    'hey'
                ];

                const lowercaseQuery = query.toLowerCase().trim();
                const isGeneralQuery = generalQueries.some(q =>
                    lowercaseQuery.includes(q) ||
                    lowercaseQuery === q
                );

                if (isGeneralQuery) {
                    // Predefined response for general queries
                    const generalResponse = "Hello! I'm CortexAI, an AI assistant specialized in analyzing and conversing with organizational private data. How can I assist you today?";

                    // Stream the response token by token
                    let responseText = '';
                    for (let char of generalResponse) {
                        responseText += char;
                        res.write(`data: ${JSON.stringify({
                            type: 'token',
                            content: char
                        })}\n\n`);

                        // Add a small delay to simulate more natural streaming
                        await new Promise(resolve => setTimeout(resolve, 2));
                    }

                    // Send the full content at the end
                    res.write(`data: ${JSON.stringify({
                        type: 'fullContent',
                        content: responseText
                    })}\n\n`);

                    return;
                }

                // If not a general query, then use the original no matches response
                const generalResponse = "I don't have enough information to answer that question. Please upload a document first or provide more context."
                let responseText = '';
                for (let char of generalResponse) {
                    responseText += char;
                    res.write(`data: ${JSON.stringify({
                        type: 'token',
                        content: char
                    })}\n\n`);

                    // Add a small delay to simulate more natural streaming
                    await new Promise(resolve => setTimeout(resolve, 2));
                }

                // Send the full content at the end
                res.write(`data: ${JSON.stringify({
                    type: 'fullContent',
                    content: responseText
                })}\n\n`);

                return;

            }

            //console.log("hello2")

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
            const userMessage = `You are an intelligent assistant for a private organization. Answer the user's question using only the information provided below.
                            Information:
                            ${relevantChunks}
                            User Question:
                            ${query}

                            Instructions:
                            - Provide a helpful and accurate answer based strictly on the information above.
                            - If the answer is not found, politely respond with something like:
                            - "There doesn't appear to be any information available on this topic."
                            - "No relevant details were found to answer your question."
                            - "We couldn't find this information at the moment."
                            Avoid mentioning anything about 'context' or internal data processing.
                            `;

            let responseText = '';

            // Stream the response
            try {
                const streamingOpenai = new ChatOpenAI({
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
                if (error.response && error.response.status === 401) {
                    res.status(401).json({
                        message: "Invalid OpenAI API key",
                        type: 'apiKeyError'
                    });
                } else {
                    console.error("Error in streaming chat:", error);
                    res.status(500).json({
                        message: "An error occurred while processing the chat",
                        type: 'streamError'
                    });
                }
                return;
            }


        } catch (error: any) {
            //console.error("Error in streaming chat:", error.status);
            if (error && error.status === 401) {
                res.status(401).json({
                    message: "Invalid OpenAI API key",
                    type: 'apiKeyError'
                });
            }
            else {
                res.status(500).json({
                    message: error.message || "An unexpected error occurred",
                    type: 'streamError'
                });
            }

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
- Keep answers concise and focused
`;
    }
}