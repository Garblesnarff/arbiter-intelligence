import { useState, useEffect } from 'react';
import { MODELS as BASE_MODELS } from '../constants';
import { ModelEntry, Claim } from '../types';
import { fetchClaimsFromRSS } from '../services/rssService';

export const useDynamicModels = () => {
  const [models, setModels] = useState<ModelEntry[]>(BASE_MODELS);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const hydrateModels = async () => {
      try {
        const claims = await fetchClaimsFromRSS();
        
        // Filter for claims that are relevant to models
        const modelClaims = claims.filter(c => c.model_relevance);

        if (modelClaims.length === 0) {
            setModels(BASE_MODELS);
            return;
        }

        // Deep merge logic
        const dynamicModels = BASE_MODELS.map(model => {
            // Find claims related to this model
            // We look for model ID or Name in the entities list
            const relatedClaims = modelClaims.filter(c => 
                c.entities.some(e => {
                    const entityLower = e.toLowerCase();
                    const nameLower = model.name.toLowerCase();
                    const idLower = model.id.toLowerCase();
                    // Basic fuzzy matching
                    return entityLower.includes(nameLower) || 
                           entityLower.includes(idLower) ||
                           (model.id === 'gemini-3-flash' && entityLower.includes('gemini flash')) ||
                           (model.id === 'gpt-5-2' && entityLower.includes('gpt-5'));
                })
            );

            // If no new info, return base model
            if (relatedClaims.length === 0) return model;

            // Sort claims by relevance/date (simplified: just take the first/latest one from RSS)
            // Note: RSS fetch returns top items, so index 0 is likely newest.
            const latestClaim = relatedClaims[0];
            
            // Create new model object
            const updatedModel: ModelEntry = {
                ...model,
                // Update snippets to reflect latest intelligence
                chronicle_snippet: latestClaim.claim_text,
                last_updated: latestClaim.date,
                // Clone benchmarks to modify
                benchmarks: { ...model.benchmarks }
            };

            // Attempt to extract benchmarks
            // If the claim has a metric value and context, try to add/update benchmarks
            relatedClaims.forEach(claim => {
                if (claim.metric_value && claim.metric_context) {
                    // This creates a dynamic key in benchmarks using the extracted context
                    // e.g., "ARC-AGI" -> "75%"
                    updatedModel.benchmarks[claim.metric_context] = claim.metric_value;
                }
            });

            return updatedModel;
        });

        setModels(dynamicModels);

      } catch (err) {
        console.error("Failed to hydrate models from chronicles:", err);
      } finally {
        setLoading(false);
      }
    };

    hydrateModels();
  }, []);

  return { models, loading };
};