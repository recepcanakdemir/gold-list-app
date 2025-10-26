const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface SurveyAnalysisRequest {
  surveyData: {
    hearAboutUs?: string
    language?: string
    level?: string
    challenge?: string
    memory?: string
    goldListExperience?: string
    unknownWordsDaily?: number
    findWordsFrom?: string[]
    learningReason?: string[]
  }
}

interface SurveyAnalysisResponse {
  recommendedDailyWords: number // 10, 15, 20, or 25
  yearlyTotal: number
  expectedMastery: number
  successProbability: number
  insights: {
    memoryStrategy: string
    progressionPlan: string
    focusAreas: string[]
    whyThisAmount: string
  }
  projections: {
    month1: number
    month3: number
    month6: number
    fluencyDays: number
  }
  error?: string
}

function buildAnalysisPrompt(surveyData: any): string {
  const {
    language = 'Unknown',
    level = 'A1',
    challenge = 'No specific challenge',
    memory = 'Average',
    goldListExperience = 'New to method',
    unknownWordsDaily = 10,
    learningReason = [],
    findWordsFrom = []
  } = surveyData

  return `You are an expert language learning analyst. Analyze this learner's profile and provide personalized recommendations for the Gold List Method.

LEARNER PROFILE:
- Target Language: ${language}
- Current Level: ${level}
- Main Challenge: ${challenge}
- Memory Pattern: ${memory}
- Gold List Experience: ${goldListExperience}
- Daily Unknown Words Encountered: ${unknownWordsDaily}
- Learning Reasons: ${learningReason.join(', ') || 'General learning'}
- Word Sources: ${findWordsFrom.join(', ') || 'Various sources'}

GOLD LIST METHOD FACTS:
- 70% of words are typically mastered after 14-day natural memory consolidation
- 30% of words are forgotten and continue to next rounds
- Daily recommendations: 10 words (light), 15 words (standard), 20 words (intensive), 25 words (maximum)
- Method works best with consistent daily practice
- No forced repetition - only natural memory testing after 14 days

ANALYSIS TASK:
Based on this profile, recommend the optimal daily word count (choose EXACTLY one: 10, 15, 20, or 25) and provide detailed insights.

Consider:
1. Current level capacity (A1-A2: lower amounts, B1-B2: moderate, C1-C2: higher)
2. Memory challenges (if struggling with memory, recommend lower amounts)
3. Daily unknown word exposure (if encountering many unknowns, can handle more)
4. Learning goals (professional/academic goals may need more words)
5. Experience with method (beginners should start lighter)

REQUIRED OUTPUT FORMAT:
RECOMMENDATION: [exactly one number: 10, 15, 20, or 25]
YEARLY_TOTAL: [recommended number × 365]
EXPECTED_MASTERY: [yearly total × 0.7, rounded to nearest whole number]
SUCCESS_PROBABILITY: [percentage from 65-95% based on profile compatibility]
MEMORY_STRATEGY: [one sentence explaining how Gold List Method helps with their memory pattern]
PROGRESSION_PLAN: [one sentence about their learning timeline]
FOCUS_AREAS: [3 areas they should prioritize, separated by commas]
WHY_THIS_AMOUNT: [one sentence explaining why this specific daily amount is optimal]
MONTH1_WORDS: [recommended × 30]
MONTH3_WORDS: [recommended × 90]
MONTH6_WORDS: [recommended × 180]
FLUENCY_DAYS: [estimate days to conversational fluency based on level and recommendation]

Keep all responses concise and practical. Focus on genuine personalization based on their specific profile.`
}

Deno.serve(async (req: Request) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Verify API key is available
    const apiKey = Deno.env.get('GEMINI_API_KEY')
    if (!apiKey) {
      console.error('GEMINI_API_KEY not found in environment variables')
      return new Response(
        JSON.stringify({ 
          error: 'AI service not configured properly',
          recommendedDailyWords: 15,
          yearlyTotal: 5475,
          expectedMastery: 3833,
          successProbability: 75,
          insights: {
            memoryStrategy: 'Gold List Method uses natural 14-day intervals to work with your memory patterns.',
            progressionPlan: 'Steady progress with consistent daily practice for optimal results.',
            focusAreas: ['Vocabulary building', 'Natural retention', 'Consistent practice'],
            whyThisAmount: 'Balanced approach suitable for most learners.'
          },
          projections: {
            month1: 450,
            month3: 1350,
            month6: 2700,
            fluencyDays: 365
          }
        } as SurveyAnalysisResponse),
        { 
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    // Parse request body
    const requestData: SurveyAnalysisRequest = await req.json()
    
    console.log(`🔍 Analyzing survey for ${requestData.surveyData.language} learner at ${requestData.surveyData.level} level`)

    const prompt = buildAnalysisPrompt(requestData.surveyData)
    console.log(`🎯 Using analysis prompt: ${prompt.substring(0, 150)}...`)

    // Call Gemini API
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:generateContent?key=${apiKey}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contents: [{
          parts: [{
            text: prompt
          }]
        }],
        generationConfig: {
          temperature: 0.3, // Lower temperature for more consistent analysis
          topK: 40,
          topP: 0.8,
          maxOutputTokens: 500,
        }
      })
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      throw new Error(`Gemini API error: ${response.status} - ${errorData.error?.message || response.statusText}`)
    }

    const data = await response.json()
    const generatedText = data.candidates?.[0]?.content?.parts?.[0]?.text
    
    if (!generatedText) {
      throw new Error('No analysis generated from Gemini API')
    }

    console.log(`✅ Generated analysis: ${generatedText}`)

    // Parse the AI response
    const recommendationMatch = generatedText.match(/RECOMMENDATION:\s*(\d+)/i)
    const yearlyTotalMatch = generatedText.match(/YEARLY_TOTAL:\s*(\d+)/i)
    const expectedMasteryMatch = generatedText.match(/EXPECTED_MASTERY:\s*(\d+)/i)
    const successProbabilityMatch = generatedText.match(/SUCCESS_PROBABILITY:\s*(\d+)/i)
    const memoryStrategyMatch = generatedText.match(/MEMORY_STRATEGY:\s*(.+?)(?=\n|$)/i)
    const progressionPlanMatch = generatedText.match(/PROGRESSION_PLAN:\s*(.+?)(?=\n|$)/i)
    const focusAreasMatch = generatedText.match(/FOCUS_AREAS:\s*(.+?)(?=\n|$)/i)
    const whyThisAmountMatch = generatedText.match(/WHY_THIS_AMOUNT:\s*(.+?)(?=\n|$)/i)
    const month1Match = generatedText.match(/MONTH1_WORDS:\s*(\d+)/i)
    const month3Match = generatedText.match(/MONTH3_WORDS:\s*(\d+)/i)
    const month6Match = generatedText.match(/MONTH6_WORDS:\s*(\d+)/i)
    const fluencyDaysMatch = generatedText.match(/FLUENCY_DAYS:\s*(\d+)/i)

    // Extract and validate data with fallbacks
    const recommendedDailyWords = parseInt(recommendationMatch?.[1] || '15')
    const validDailyWords = [10, 15, 20, 25].includes(recommendedDailyWords) ? recommendedDailyWords : 15
    
    const yearlyTotal = parseInt(yearlyTotalMatch?.[1] || '') || (validDailyWords * 365)
    const expectedMastery = parseInt(expectedMasteryMatch?.[1] || '') || Math.round(yearlyTotal * 0.7)
    const successProbability = Math.min(95, Math.max(65, parseInt(successProbabilityMatch?.[1] || '75')))

    const responseData: SurveyAnalysisResponse = {
      recommendedDailyWords: validDailyWords,
      yearlyTotal,
      expectedMastery,
      successProbability,
      insights: {
        memoryStrategy: memoryStrategyMatch?.[1]?.trim() || 'Gold List Method uses natural memory consolidation to improve retention.',
        progressionPlan: progressionPlanMatch?.[1]?.trim() || 'Steady progress through consistent daily practice.',
        focusAreas: focusAreasMatch?.[1]?.split(',').map((s: string) => s.trim()) || ['Vocabulary building', 'Consistent practice', 'Natural retention'],
        whyThisAmount: whyThisAmountMatch?.[1]?.trim() || 'Optimal balance between challenge and sustainability.'
      },
      projections: {
        month1: parseInt(month1Match?.[1] || '') || (validDailyWords * 30),
        month3: parseInt(month3Match?.[1] || '') || (validDailyWords * 90),
        month6: parseInt(month6Match?.[1] || '') || (validDailyWords * 180),
        fluencyDays: parseInt(fluencyDaysMatch?.[1] || '') || 365
      }
    }

    console.log(`🎉 Analysis complete: ${validDailyWords} words/day, ${successProbability}% success probability`)

    return new Response(
      JSON.stringify(responseData),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )

  } catch (error) {
    console.error('Error analyzing survey:', error)
    
    // Return smart fallback based on available data
    const fallbackResponse: SurveyAnalysisResponse = {
      recommendedDailyWords: 15,
      yearlyTotal: 5475,
      expectedMastery: 3833,
      successProbability: 75,
      insights: {
        memoryStrategy: 'Gold List Method uses natural 14-day intervals to strengthen memory retention.',
        progressionPlan: 'Steady vocabulary growth through consistent daily practice.',
        focusAreas: ['Daily consistency', 'Natural retention', 'Vocabulary building'],
        whyThisAmount: 'Balanced approach suitable for most learning goals and schedules.'
      },
      projections: {
        month1: 450,
        month3: 1350,
        month6: 2700,
        fluencyDays: 365
      },
      error: error instanceof Error ? error.message : 'Analysis service temporarily unavailable'
    }
    
    return new Response(
      JSON.stringify(fallbackResponse),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )
  }
})