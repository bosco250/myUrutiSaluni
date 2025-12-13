import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class ImageSearchService {
  private readonly logger = new Logger(ImageSearchService.name);
  private readonly googleApiKey: string;
  private readonly googleSearchEngineId: string;

  constructor(private configService: ConfigService) {
    // Use the same GOOGLE_API_KEY from .env (used for Gemini)
    this.googleApiKey = this.configService.get<string>('GOOGLE_API_KEY') || '';

    // Use custom search engine ID if provided, otherwise use default that searches entire web
    this.googleSearchEngineId =
      this.configService.get<string>('GOOGLE_SEARCH_ENGINE_ID') ||
      '017576662512468239146:omuauf_lfve'; // Default: searches entire web

    if (!this.googleApiKey) {
      this.logger.warn(
        'GOOGLE_API_KEY not found - image search will use fallback',
      );
    } else {
      this.logger.log(
        `Using Google Image Search with Search Engine ID: ${this.googleSearchEngineId}`,
      );
    }
  }

  /**
   * Search for hairstyle images using Google Custom Search API
   */
  async searchHairstyleImage(searchTerm: string): Promise<string | null> {
    if (!this.googleApiKey || !this.googleSearchEngineId) {
      return null;
    }

    try {
      // Enhance search term to be more specific for hairstyle images
      let enhancedTerm = searchTerm.toLowerCase();

      // If it doesn't already contain hair-related keywords, add them
      if (
        !/\b(hair|hairstyle|haircut|haircutting|barber|salon|stylist)\b/i.test(
          enhancedTerm,
        )
      ) {
        enhancedTerm = `${enhancedTerm} hairstyle`;
      }

      // Remove any non-essential words that might confuse the search
      enhancedTerm = enhancedTerm
        .replace(/\b(the|a|an|with|for|and|or|but)\b/gi, '')
        .replace(/\s+/g, ' ')
        .trim();

      const encodedTerm = encodeURIComponent(enhancedTerm);
      const url = `https://www.googleapis.com/customsearch/v1?key=${this.googleApiKey}&cx=${this.googleSearchEngineId}&q=${encodedTerm}&searchType=image&num=5&safe=active&imgSize=medium&imgType=photo`;

      const response = await fetch(url);

      if (!response.ok) {
        const errorText = await response.text();
        let errorData;
        try {
          errorData = JSON.parse(errorText);
        } catch {
          errorData = { error: { message: errorText } };
        }

        this.logger.error(
          `Google Image Search API error: ${response.status} - ${errorData.error?.message || errorText.substring(0, 200)}`,
        );

        // Log helpful message for common errors
        if (response.status === 403) {
          this.logger.error(
            '403 Forbidden - Make sure: 1) Custom Search API is enabled in Google Cloud Console, 2) API key has permission for Custom Search API, 3) Search Engine ID is correct',
          );
        }

        return null;
      }

      const data = await response.json();
      const items = data.items || [];

      if (items.length === 0) {
        return null;
      }

      // Try to find the best matching image (prefer images with "hair" in title/snippet)
      let bestImage = items[0];

      if (items.length > 1) {
        // Look for images that have hair-related keywords in their title or snippet
        for (const item of items) {
          const title = (item.title || '').toLowerCase();
          const snippet = (item.snippet || '').toLowerCase();

          if (
            /\b(hair|hairstyle|haircut|barber|salon|stylist|haircutting|hair\s+style)\b/i.test(
              title + ' ' + snippet,
            )
          ) {
            bestImage = item;
            break;
          }
        }
      }

      // Return the image link
      if (bestImage?.link) {
        return bestImage.link;
      }

      return null;
    } catch (error: any) {
      return null;
    }
  }

  /**
   * Batch search for multiple hairstyle images
   */
  async searchMultipleHairstyleImages(
    searchTerms: string[],
  ): Promise<Map<string, string>> {
    const imageMap = new Map<string, string>();

    // Search in parallel with a small delay to respect rate limits
    const promises = searchTerms.map(async (term, index) => {
      // Add small delay to avoid rate limiting
      await new Promise((resolve) => setTimeout(resolve, index * 200));
      const url = await this.searchHairstyleImage(term);
      if (url) {
        imageMap.set(term, url);
      }
    });

    await Promise.all(promises);
    return imageMap;
  }
}
