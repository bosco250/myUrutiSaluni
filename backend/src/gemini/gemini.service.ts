import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ImageSearchService } from './image-search.service';

export interface FaceAnalysisResult {
  faceShape: 'Oval' | 'Round' | 'Square' | 'Heart' | 'Oblong' | 'Diamond';
  analysisDescription: string;
  recommendations: StyleRecommendation[];
  stylingTips: string[];
}

export interface StyleRecommendation {
  id: string;
  name: string;
  matchPercentage: number;
  description: string;
  imageSearchTerm?: string; // Search term for finding hairstyle images
  imageUrl?: string; // Direct image URL if available
}

@Injectable()
export class GeminiService {
  private readonly logger = new Logger(GeminiService.name);
  private readonly apiKey: string;
  private readonly model: string;
  private readonly apiUrl: string;

  constructor(
    private configService: ConfigService,
    private imageSearchService: ImageSearchService,
  ) {
    this.apiKey = this.configService.get<string>('GEMINI_API_KEY') || '';
    if (!this.apiKey) {
      this.logger.warn('GEMINI_API_KEY not found in environment variables');
    }

    // Get model from environment variable, default to gemini-2.5-flash
    const modelFromEnv = this.configService.get<string>('LLM_MODEL');
    this.model = modelFromEnv || 'models/gemini-2.5-flash';

    // Construct API URL with the model
    this.apiUrl = `https://generativelanguage.googleapis.com/v1beta/${this.model}:generateContent`;

    this.logger.log(`Using Gemini model: ${this.model}`);
  }

  /**
   * Analyze face from base64 image and get recommendations
   */
  async analyzeFace(imageBase64: string): Promise<FaceAnalysisResult> {
    if (!this.apiKey) {
      throw new Error('Gemini API key not configured');
    }

    try {
      const prompt = `You are a professional hairstylist and face shape expert. Analyze this face image carefully and provide personalized hairstyle recommendations.

CRITICAL: First, analyze the person in the image to determine:
- Estimated age group: Baby (0-2), Child (3-12), Teenager (13-19), Young Adult (20-35), Adult (36-60), Senior (60+)
- Gender: Male, Female, or Non-binary
- Face shape (must be one of: Oval, Round, Square, Heart, Oblong, Diamond)

Then provide:
1. Face shape (must be one of: Oval, Round, Square, Heart, Oblong, Diamond)
2. Demographics detected: age group and gender
3. A brief, specific analysis description (1-2 sentences about the face shape characteristics and why certain styles work)
4. Exactly 4 different, specific hairstyle recommendations that would suit this person. Each recommendation must have:
   - A specific, descriptive name appropriate for the detected age and gender
   - A match percentage between 75-100 (realistic percentages based on how well it suits the face)
   - A detailed description explaining why this style works for this specific face shape, age, and gender
   - An imageSearchTerm: a specific search term (2-4 words) that would find good example images of this hairstyle online (e.g., "women long layered waves", "men short fade haircut", "teenager pixie cut", "baby curly hair", "senior short bob")
5. Exactly 3 specific styling tips tailored to this face shape, age, and gender

IMPORTANT: 
- Recommendations MUST be appropriate for the detected age and gender:
  * Babies/Children: Simple, easy-care styles, natural looks
  * Teenagers: Trendy, modern styles, creative options
  * Young Adults: Versatile, professional yet stylish
  * Adults: Classic, professional, low-maintenance options
  * Seniors: Easy-care, age-appropriate, elegant styles
- For males: Include short cuts, fades, undercuts, pompadours, etc.
- For females: Include long, medium, short styles, updos, braids, etc.
- Provide DIFFERENT hairstyles for each recommendation (not variations of the same style)
- Make recommendations specific and varied (short, medium, long, updo, etc.)
- Match percentages should vary (e.g., 85, 92, 88, 90) to show different suitability levels
- Be creative and specific with hairstyle names
- Image search terms should be specific and include age/gender context

Return ONLY valid JSON in this exact format (no markdown, no code blocks, no extra text):
{
  "faceShape": "Oval",
  "demographics": {
    "ageGroup": "Young Adult",
    "gender": "Female"
  },
  "analysisDescription": "Your face has balanced proportions with slightly wider cheekbones and a gently rounded jawline, perfect for versatile styling options.",
  "recommendations": [
    {
      "name": "Long Layered Waves",
      "matchPercentage": 92,
      "description": "Soft, face-framing layers add movement and complement your balanced features beautifully. Perfect for young adults seeking a versatile, trendy look.",
      "imageSearchTerm": "women long layered waves hairstyle"
    },
    {
      "name": "Pixie Cut with Side-Swept Bangs",
      "matchPercentage": 88,
      "description": "A modern pixie with textured layers creates volume at the crown while side bangs soften the look. Ideal for a bold, low-maintenance style.",
      "imageSearchTerm": "young women pixie cut side bangs"
    },
    {
      "name": "Shoulder-Length Bob with Textured Ends",
      "matchPercentage": 90,
      "description": "A classic bob with subtle layers adds dimension and frames your face perfectly. Professional yet stylish for everyday wear.",
      "imageSearchTerm": "women shoulder length bob textured"
    },
    {
      "name": "High Bun with Face-Framing Pieces",
      "matchPercentage": 85,
      "description": "An elegant updo with loose face-framing strands creates a sophisticated look for special occasions while maintaining a youthful appearance.",
      "imageSearchTerm": "women high bun face framing hairstyle"
    }
  ],
  "stylingTips": [
    "Layers that start at your cheekbones will add definition to your features",
    "Avoid styles that add too much volume at the sides, as they can make your face appear wider",
    "Side parts work exceptionally well with your face shape, creating a flattering asymmetry"
  ]
}`;

      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/${this.model}:generateContent?key=${this.apiKey}`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            contents: [
              {
                parts: [
                  {
                    text: prompt,
                  },
                  {
                    inlineData: {
                      mimeType: 'image/jpeg',
                      data: imageBase64,
                    },
                  },
                ],
              },
            ],
            generationConfig: {
              responseMimeType: 'application/json',
              temperature: 0.7,
              topP: 0.95,
              topK: 40,
            },
          }),
        },
      );

      let data;
      if (!response.ok) {
        const errorText = await response.text();
        let errorData;
        try {
          errorData = JSON.parse(errorText);
        } catch {
          errorData = { error: { message: errorText } };
        }

        // Handle rate limiting (429) - retry with delay
        if (response.status === 429) {
          const retryDelaySeconds = errorData.error?.details?.[2]?.retryDelay
            ? parseFloat(errorData.error.details[2].retryDelay)
            : 60; // Default 60 seconds

          const retryDelay = retryDelaySeconds * 1000;

          this.logger.warn(
            `Gemini API rate limit exceeded (20 requests/day free tier). Retrying in ${retryDelaySeconds} seconds...`,
          );

          // Wait and retry once
          await new Promise((resolve) => setTimeout(resolve, retryDelay));

          // Retry the request
          const retryResponse = await fetch(
            `https://generativelanguage.googleapis.com/v1beta/${this.model}:generateContent?key=${this.apiKey}`,
            {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                contents: [
                  {
                    parts: [
                      {
                        text: prompt,
                      },
                      {
                        inlineData: {
                          mimeType: 'image/jpeg',
                          data: imageBase64,
                        },
                      },
                    ],
                  },
                ],
                generationConfig: {
                  responseMimeType: 'application/json',
                  temperature: 0.7,
                  topP: 0.95,
                  topK: 40,
                },
              }),
            },
          );

          if (!retryResponse.ok) {
            const retryErrorText = await retryResponse.text();
            let retryErrorData;
            try {
              retryErrorData = JSON.parse(retryErrorText);
            } catch {
              retryErrorData = { error: { message: retryErrorText } };
            }

            throw new Error(
              `Gemini API error after retry: ${retryErrorData.error?.message || 'Rate limit still exceeded'}. Free tier limit is 20 requests/day. Please wait or upgrade your plan.`,
            );
          }

          // Use retry response
          data = await retryResponse.json();
        } else {
          this.logger.error(
            `Gemini API error: ${response.status} - ${errorData.error?.message || errorText}`,
          );
          throw new Error(
            `Gemini API error: ${errorData.error?.message || response.statusText}`,
          );
        }
      } else {
        data = await response.json();
      }

      // Extract text from Gemini response
      const textContent = data.candidates?.[0]?.content?.parts?.[0]?.text;
      if (!textContent) {
        this.logger.error(
          'No text content in Gemini response:',
          JSON.stringify(data),
        );
        throw new Error('No response from Gemini API');
      }

      // Parse JSON from response (remove markdown code blocks if present)
      let jsonText = textContent.trim();

      // Remove markdown code blocks
      if (jsonText.startsWith('```json')) {
        jsonText = jsonText.replace(/```json\n?/g, '').replace(/```\n?/g, '');
      } else if (jsonText.startsWith('```')) {
        jsonText = jsonText.replace(/```\n?/g, '');
      }

      // Try to find JSON object in the text if it's embedded
      const jsonMatch = jsonText.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        jsonText = jsonMatch[0];
      }

      let analysis;
      try {
        analysis = JSON.parse(jsonText);
      } catch (parseError: any) {
        this.logger.error(
          'Failed to parse JSON from Gemini response:',
          parseError.message,
        );
        this.logger.error(
          'JSON text that failed to parse:',
          jsonText.substring(0, 500),
        );
        throw new Error(
          `Failed to parse Gemini response: ${parseError.message}`,
        );
      }

      // Validate and process recommendations
      if (
        !analysis.recommendations ||
        !Array.isArray(analysis.recommendations)
      ) {
        this.logger.warn(
          'No recommendations array in response, using fallback',
        );
        throw new Error('Invalid response format: missing recommendations');
      }

      // Generate IDs for recommendations and validate data
      const recommendations: StyleRecommendation[] = analysis.recommendations
        .slice(0, 4) // Limit to 4
        .map((rec: any, index: number) => {
          // Ensure we have valid data
          const name = rec.name || rec.style || `Style ${index + 1}`;
          const matchPercentage = Math.min(
            100,
            Math.max(0, Number(rec.matchPercentage) || 85),
          );
          const description =
            rec.description ||
            rec.reason ||
            'A great style for your face shape';

          // Extract image search term - try multiple possible field names
          const imageSearchTermRaw =
            rec.imageSearchTerm ||
            rec.searchTerm ||
            rec.imageSearch ||
            rec.search ||
            rec.imageSearchQuery ||
            `${name} hairstyle`;

          // Clean up search term - remove face shape references and ensure it's hairstyle-focused
          let imageSearchTerm = imageSearchTermRaw
            .replace(
              /\b(oblong|oval|round|square|heart|diamond)\s+face\b/gi,
              '',
            )
            .replace(/\s+/g, ' ')
            .trim();

          // Ensure the search term includes "hairstyle" or "haircut" for better results
          const hasHairKeyword =
            /\b(hairstyle|haircut|hair\s+style|hair\s+cut)\b/i.test(
              imageSearchTerm,
            );
          if (!hasHairKeyword) {
            // Add "hairstyle" if not present, but keep it natural
            imageSearchTerm = `${imageSearchTerm} hairstyle`;
          }

          // If the cleaned term is too short, use the original name with hairstyle
          if (imageSearchTerm.split(' ').length < 2) {
            imageSearchTerm = `${name} hairstyle`;
          }

          return {
            id: `rec-${index + 1}`,
            name: name,
            matchPercentage: matchPercentage,
            description: description,
            imageSearchTerm: imageSearchTerm,
          };
        });

      // Validate we have at least 4 recommendations
      if (recommendations.length < 4) {
        this.logger.warn(
          `Only received ${recommendations.length} recommendations, expected 4`,
        );
      }

      // Fetch images for recommendations in parallel
      const imageSearchTerms = recommendations.map(
        (rec) => rec.imageSearchTerm || rec.name,
      );

      const imageMap =
        await this.imageSearchService.searchMultipleHairstyleImages(
          imageSearchTerms,
        );

      // Add image URLs to recommendations
      const recommendationsWithImages = recommendations.map((rec) => {
        const imageUrl = imageMap.get(rec.imageSearchTerm || rec.name) || null;
        return {
          ...rec,
          imageUrl: imageUrl,
        };
      });

      const result = {
        faceShape: (analysis.faceShape ||
          'Oval') as FaceAnalysisResult['faceShape'],
        analysisDescription:
          analysis.analysisDescription ||
          analysis.description ||
          'Face analysis completed',
        recommendations: recommendationsWithImages,
        stylingTips: Array.isArray(analysis.stylingTips)
          ? analysis.stylingTips.slice(0, 3)
          : [
              'Consider styles that complement your face shape',
              'Layers can add dimension',
              'Consult with a stylist for personalized advice',
            ],
      };

      return result;
    } catch (error: any) {
      this.logger.error('Error analyzing face with Gemini:', error);
      this.logger.error('Error stack:', error.stack);

      // Return fallback data if API fails
      return {
        faceShape: 'Oval',
        analysisDescription: 'Unable to analyze face. Please try again.',
        recommendations: [
          {
            id: 'rec-1',
            name: 'Long Waves',
            matchPercentage: 90,
            description: 'Soft waves that frame the face beautifully',
          },
          {
            id: 'rec-2',
            name: 'High Bun',
            matchPercentage: 85,
            description: 'Elegant and versatile style',
          },
          {
            id: 'rec-3',
            name: 'Curly Updo',
            matchPercentage: 88,
            description: 'Perfect for special occasions',
          },
          {
            id: 'rec-4',
            name: 'Side Part',
            matchPercentage: 82,
            description: 'Classic and timeless look',
          },
        ],
        stylingTips: [
          'Styles that add width at the temples work great',
          'Soft layers frame your face beautifully',
          'Side-swept bangs complement your features',
        ],
      };
    }
  }
}
