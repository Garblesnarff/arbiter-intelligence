import { useMemo } from 'react';
import { MODELS as BASE_MODELS } from '../constants';
import { ModelEntry } from '../types';
import { useClaimsData } from '../contexts/ClaimsContext';

export const useDynamicModels = () => {
  const { claims, loading } = useClaimsData();

  const models = useMemo<ModelEntry[]>(() => {
    const modelClaims = claims.filter(c => c.model_relevance);

    if (modelClaims.length === 0) {
      return BASE_MODELS;
    }

    return BASE_MODELS.map((model) => {
      const relatedClaims = modelClaims.filter((claim) =>
        claim.entities.some((entity) => {
          const entityLower = entity.toLowerCase();
          const nameLower = model.name.toLowerCase();
          const idLower = model.id.toLowerCase();
          return entityLower.includes(nameLower)
            || entityLower.includes(idLower)
            || (model.id === 'gemini-3-flash' && entityLower.includes('gemini flash'))
            || (model.id === 'gpt-5-2' && entityLower.includes('gpt-5'));
        })
      );

      if (relatedClaims.length === 0) {
        return model;
      }

      const latestClaim = relatedClaims[0];
      const updatedModel: ModelEntry = {
        ...model,
        chronicle_snippet: latestClaim.claim_text,
        last_updated: latestClaim.date,
        benchmarks: { ...model.benchmarks },
      };

      relatedClaims.forEach((claim) => {
        if (claim.metric_value && claim.metric_context) {
          updatedModel.benchmarks[claim.metric_context] = claim.metric_value;
        }
      });

      return updatedModel;
    });
  }, [claims]);

  return { models, loading };
};
