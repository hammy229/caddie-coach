import { BedrockRuntimeClient, ConverseCommand } from "@aws-sdk/client-bedrock-runtime";
import { templateRecap, type RoundReport } from "./report.js";

export interface Narrator {
  recap(report: RoundReport): Promise<string>;
}

export class TemplateNarrator implements Narrator {
  async recap(report: RoundReport): Promise<string> {
    return templateRecap(report);
  }
}

/** Writes the spoken post-round recap with Amazon Bedrock; falls back to the template on any failure. */
export class BedrockNarrator implements Narrator {
  constructor(
    private readonly modelId: string,
    private readonly client: BedrockRuntimeClient = new BedrockRuntimeClient({}),
    private readonly fallback: Narrator = new TemplateNarrator(),
  ) {}

  async recap(report: RoundReport): Promise<string> {
    const prompt = [
      "You are a golf caddie giving a spoken post-round recap through a smart speaker.",
      "Using ONLY the facts in this JSON, write 3 to 4 short sentences: one strength, one weakness,",
      "how it compares to earlier rounds if data exists, and one concrete thing to practice.",
      "No lists, no markdown, no numbers that are not in the data.",
      JSON.stringify(report),
    ].join("\n");
    try {
      const res = await this.client.send(
        new ConverseCommand({
          modelId: this.modelId,
          messages: [{ role: "user", content: [{ text: prompt }] }],
          inferenceConfig: { maxTokens: 300, temperature: 0.3 },
        }),
      );
      const text = res.output?.message?.content?.find((c) => "text" in c)?.text?.trim();
      return text || (await this.fallback.recap(report));
    } catch {
      return this.fallback.recap(report);
    }
  }
}

export function createNarrator(env: NodeJS.ProcessEnv = process.env): Narrator {
  return env.BEDROCK_MODEL_ID ? new BedrockNarrator(env.BEDROCK_MODEL_ID) : new TemplateNarrator();
}
