import { pipeline, type FeatureExtractionPipeline } from "@huggingface/transformers";

let extractor: FeatureExtractionPipeline | null = null;

export async function initEmbedding(): Promise<void> {
  if (!extractor) {
    console.log("Loading embedding model (first time may download ~30MB)...");
    extractor = await pipeline("feature-extraction", "Xenova/all-MiniLM-L6-v2", {
      dtype: "fp32",
    });
    console.log("Embedding model loaded.");
  }
}

export async function embed(text: string): Promise<number[]> {
  if (!extractor) await initEmbedding();
  const result = await extractor!(text, { pooling: "mean", normalize: true });
  return Array.from(result.data as Float32Array);
}
