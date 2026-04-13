import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";

let mcpClient: Client | null = null;

const VAULT_SERVER_PATH =
  process.env.OBSIDIAN_MCP_SERVER_PATH ||
  "/Users/k22062kk/Library/Mobile Documents/iCloud~md~obsidian/Documents/My Value/vault-mcp-server.py";

export async function initMcpClient(): Promise<void> {
  try {
    const transport = new StdioClientTransport({
      command: "python3",
      args: [VAULT_SERVER_PATH],
    });

    mcpClient = new Client({
      name: "notify-me",
      version: "1.0.0",
    });

    await mcpClient.connect(transport);
    console.log("Obsidian vault MCP connected.");
  } catch (err) {
    console.warn("MCP connection failed (non-fatal):", err);
    mcpClient = null;
  }
}

export async function searchVault(
  query: string,
  scope: string = "all"
): Promise<string> {
  if (!mcpClient) return "";
  try {
    const result = await mcpClient.callTool({
      name: "search_vault",
      arguments: { query, scope },
    });
    return (result.content as Array<{ text: string }>)[0]?.text || "";
  } catch {
    return "";
  }
}

export async function readWiki(topic: string): Promise<string> {
  if (!mcpClient) return "";
  try {
    const result = await mcpClient.callTool({
      name: "read_wiki",
      arguments: { topic },
    });
    return (result.content as Array<{ text: string }>)[0]?.text || "";
  } catch {
    return "";
  }
}

export function isMcpConnected(): boolean {
  return mcpClient !== null;
}
