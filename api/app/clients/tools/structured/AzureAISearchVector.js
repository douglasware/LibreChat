const { z } = require('zod');
const { StructuredTool } = require('langchain/tools');
const { logger } = require('~/config');
const { OpenAIClient, AzureKeyCredential } = require("@azure/openai");

class AzureAISearchVector extends StructuredTool {
    // Constants for default values
    static DEFAULT_API_VERSION = '2023-10-01-preview';
    static DEFAULT_QUERY_TYPE = 'vectorSimpleHybrid';
    static DEFAULT_AZURE_AI_SEARCH_STRICTNESS = 3;
    static DEFAULT_AZURE_AI_SEARCH_TOP_N_DOCUMENTS = 10;
    static DEFAULT_AZURE_OPENAI_API_EMBEDDINGS_API_ENDPOINT = 'text-embedding-ada-002';
    static DEFAULT_AZURE_OPENAI_API_COMPLETIONS_DEPLOYMENT_NAME = 'gpt-35-turbo-16k';

    // Helper function for initializing properties
    _initializeField(field, envVar, defaultValue) {
        return field || process.env[envVar] || defaultValue;
    }

    constructor(fields = {}) {
        super();
        this.name = 'azure-ai-search-vector';
        this.description =
            'Use the \'azure-ai-search-vector\' tool to retrieve search results relevant to your input';
        /* Used to initialize the Tool without necessary variables. */
        this.override = fields.override ?? false;

        // Define schema
        this.schema = z.object({
            query: z.string().describe('Search word or phrase to Azure AI Search'),
        });

        // Initialize properties using helper function
        this.openAiEndpoint = this._initializeField(
            fields.AZURE_OPENAI_API_ENDPOINT,
            'AZURE_OPENAI_API_ENDPOINT',
        );
        this.completionsDeploymentId = this._initializeField(
            fields.DEFAULT_AZURE_OPENAI_API_COMPLETIONS_DEPLOYMENT_NAME,
            'DEFAULT_AZURE_OPENAI_API_COMPLETIONS_DEPLOYMENT_NAME',
            AzureAISearchVector.DEFAULT_AZURE_OPENAI_API_COMPLETIONS_DEPLOYMENT_NAME,
        );
        this.openAiApiKey = this._initializeField(
            fields.AZURE_OPENAI_API_KEY,
            'AZURE_OPENAI_API_KEY',
        );
        this.embeddingsEndpoint = this._initializeField(
            fields.AZURE_OPENAI_API_EMBEDDINGS_API_ENDPOINT,
            'AZURE_OPENAI_API_EMBEDDINGS_API_ENDPOINT',
            AzureAISearchVector.DEFAULT_AZURE_OPENAI_API_EMBEDDINGS_API_ENDPOINT,
        );
        this.searchServiceEndpoint = this._initializeField(
            fields.AZURE_AI_SEARCH_SERVICE_ENDPOINT,
            'AZURE_AI_SEARCH_SERVICE_ENDPOINT',
        );
        this.searchIndexName = this._initializeField(
            fields.AZURE_AI_SEARCH_INDEX_NAME,
            'AZURE_AI_SEARCH_INDEX_NAME',
        );
        this.seachApiKey = this._initializeField(
            fields.AZURE_AI_SEARCH_API_KEY,
            'AZURE_AI_SEARCH_API_KEY',
        );
        this.apiVersion = this._initializeField(
            fields.AZURE_AI_SEARCH_API_VERSION,
            'AZURE_AI_SEARCH_API_VERSION',
            AzureAISearchVector.DEFAULT_API_VERSION,
        );

        this.queryType = AzureAISearchVector.DEFAULT_QUERY_TYPE;

        this.strictness = this._initializeField(
            fields.AZURE_AI_SEARCH_STRICTNESS,
            'AZURE_AI_SEARCH_STRICTNESS',
            AzureAISearchVector.DEFAULT_AZURE_AI_SEARCH_STRICTNESS,
        );

        this.top = this._initializeField(
            fields.AZURE_AI_SEARCH_SEARCH_OPTION_TOP,
            'AZURE_AI_SEARCH_SEARCH_OPTION_TOP',
            AzureAISearchVector.DEFAULT_AZURE_AI_SEARCH_TOP_N_DOCUMENTS,
        );

        // Check for required fields
        if (!this.override &&
            (
                !this.openAiEndpoint ||
                !this.openAiApiKey ||
                !this.embeddingsEndpoint ||
                !this.searchServiceEndpoint ||
                !this.searchIndexName ||
                !this.seachApiKey ||
                !this.apiVersion ||
                !this.queryType ||
                !this.strictness ||
                !this.top
            )
        ) {
            throw new Error(
                'Missing a required config value.',
            );
        }

        if (this.override) {
            return;
        }

        // Create SearchClient
        this.client = new OpenAIClient(this.openAiEndpoint, new AzureKeyCredential(this.openAiApiKey));
        this.azureExtensionOptions = {
            azureExtensionOptions: {
                extensions: [
                    {
                        type: "AzureCognitiveSearch",
                        endpoint: this.searchServiceEndpoint,
                        key: this.seachApiKey,
                        indexName: this.searchIndexName,
                        embeddingEndpoint: this.embeddingsEndpoint,
                        embeddingKey: this.openAiApiKey,
                        queryType: 'vectorSimpleHybrid', // this.DEFAULT_QUERY_TYPE,
                        inScope: true,
                        strictness: 3,
                        topDocuments: 10,
                        roleInformation: "You are an AI assistant that helps people find information",

                    },
                ],
            }
        }
    }

    // Improved error handling and logging
    async _call(data) {
        const { query } = data;
        try {
            const messages = [
                { role: "user", content: query },
            ];

            console.log(`Message: ${messages.map((m) => m.content).join("\n")}`);
            const result = await this.client.getChatCompletions(this.completionsDeploymentId, messages, this.azureExtensionOptions);

            return JSON.stringify(result);
        } catch (error) {
            logger.error('Azure AI Search request failed', error);
            return 'There was an error with Azure AI Search.';
        }
    }
}

module.exports = AzureAISearchVector;
