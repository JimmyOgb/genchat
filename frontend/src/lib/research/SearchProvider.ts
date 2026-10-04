/**
 * SearchProvider Abstraction
 * Section 10: Extensible web search provider with strict citation integrity.
 */

export interface SearchResultItem {
  title: string;
  url: string;
  snippet: string;
  source?: string;
}

export interface SearchResponse {
  query: string;
  results: SearchResultItem[];
  providerName: string;
}

export interface SearchProvider {
  name: string;
  isConfigured(): boolean;
  search(query: string, maxResults?: number): Promise<SearchResponse>;
}

/**
 * Serper (Google Search API) Provider
 */
export class SerperSearchProvider implements SearchProvider {
  name = "Serper";

  isConfigured(): boolean {
    return !!process.env.SERPER_API_KEY;
  }

  async search(query: string, maxResults: number = 5): Promise<SearchResponse> {
    const apiKey = process.env.SERPER_API_KEY;
    if (!apiKey) {
      throw new Error("SERPER_API_KEY is not configured.");
    }

    const response = await fetch("https://google.serper.dev/search", {
      method: "POST",
      headers: {
        "X-API-KEY": apiKey,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        q: query,
        num: maxResults,
      }),
    });

    if (!response.ok) {
      throw new Error(`Serper API error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    const organic = data.organic || [];

    const results: SearchResultItem[] = organic.slice(0, maxResults).map((item: any) => ({
      title: item.title || "No Title",
      url: item.link || "",
      snippet: item.snippet || "",
      source: item.sitelinks?.[0]?.title || new URL(item.link || "https://example.com").hostname,
    }));

    return {
      query,
      results,
      providerName: this.name,
    };
  }
}

/**
 * Tavily Search Provider
 */
export class TavilySearchProvider implements SearchProvider {
  name = "Tavily";

  isConfigured(): boolean {
    return !!process.env.TAVILY_API_KEY;
  }

  async search(query: string, maxResults: number = 5): Promise<SearchResponse> {
    const apiKey = process.env.TAVILY_API_KEY;
    if (!apiKey) {
      throw new Error("TAVILY_API_KEY is not configured.");
    }

    const response = await fetch("https://api.tavily.com/search", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        api_key: apiKey,
        query,
        max_results: maxResults,
        search_depth: "basic",
      }),
    });

    if (!response.ok) {
      throw new Error(`Tavily API error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    const items = data.results || [];

    const results: SearchResultItem[] = items.slice(0, maxResults).map((item: any) => ({
      title: item.title || "No Title",
      url: item.url || "",
      snippet: item.content || "",
      source: new URL(item.url || "https://example.com").hostname,
    }));

    return {
      query,
      results,
      providerName: this.name,
    };
  }
}

/**
 * Get active search provider or null if unconfigured
 */
export function getActiveSearchProvider(): SearchProvider | null {
  const serper = new SerperSearchProvider();
  if (serper.isConfigured()) return serper;

  const tavily = new TavilySearchProvider();
  if (tavily.isConfigured()) return tavily;

  return null;
}
