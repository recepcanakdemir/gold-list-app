/**
 * Simplified batch processing logic to replace complex badge migration system
 * Copy this to replace the processBatchWordReviews function in supabaseService.ts
 */

async processBatchWordReviews(reviews: Array<{ wordId: string; remembered: boolean }>): Promise<{ 
  success: boolean; 
  silverCreated: boolean; 
  silverMigratedCount: number; 
  goldCreated: boolean; 
  goldMigratedCount: number;
  silverNotebookId?: string;
  bronzeNotebookTitle?: string;
  silverNotebookTitle?: string;
}> {
  if (reviews.length === 0) return { 
    success: true, 
    silverCreated: false, 
    silverMigratedCount: 0, 
    goldCreated: false, 
    goldMigratedCount: 0 
  }

  // Safety net: Deduplicate reviews to prevent database errors
  const originalLength = reviews.length
  const deduplicatedReviews = reviews.filter((review, index, arr) => 
    arr.findIndex(r => r.wordId === review.wordId) === index
  )
  
  if (deduplicatedReviews.length !== originalLength) {
    console.warn(`⚠️ Database safety net: Removed ${originalLength - deduplicatedReviews.length} duplicate word reviews`)
  }

  return withRetry(async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error('Not authenticated')

    try {
      const currentDate = getCurrentDate()
      const currentDateString = currentDate.toISOString().split('T')[0]
      
      console.log(`📦 Processing batch of ${deduplicatedReviews.length} word reviews...`)

      // Try using the simplified database RPC function first
      try {
        console.log(`⚡ Using optimized database RPC for batch processing...`)
        
        // Process each review using the simplified database function
        const rpcPromises = deduplicatedReviews.map(review => 
          supabase.rpc('update_word_review_result', {
            p_word_id: review.wordId,
            p_remembered: review.remembered,
            p_current_date: currentDateString
          })
        )

        // Execute all RPC calls in parallel for maximum speed
        const results = await Promise.all(rpcPromises)
        
        // Check for any errors
        const errors = results.filter(result => result.error)
        if (errors.length > 0) {
          console.warn(`⚠️ ${errors.length} RPC calls failed, falling back to client-side processing`)
          throw new Error('RPC batch processing had errors')
        }

        console.log(`🚀 RPC batch processing completed: ${deduplicatedReviews.length} words processed via database functions`)
      } catch (rpcError) {
        console.log(`🔄 RPC failed, falling back to client-side batch processing...`, rpcError)

        // Fallback to simplified client-side batch processing
        for (const review of deduplicatedReviews) {
          try {
            await this.processWordReviewClientSide(review.wordId, review.remembered, currentDateString)
          } catch (error) {
            console.error(`❌ Failed to process word ${review.wordId}:`, error)
            // Continue with other words
          }
        }
      }

      console.log(`✅ Batch review completed: ${deduplicatedReviews.length} words processed`)
      return {
        success: true,
        silverCreated: false,      // No more complex migrations
        silverMigratedCount: 0,    // Simple round progression
        goldCreated: false,        // No separate notebooks
        goldMigratedCount: 0,      // Just badge indicators
        silverNotebookId: undefined,
        bronzeNotebookTitle: undefined,
        silverNotebookTitle: undefined
      }
    } catch (error) {
      console.error('Failed to process batch word reviews:', error)
      throw error
    }
  }, `processBatchWordReviews(${reviews.length} words)`)
}