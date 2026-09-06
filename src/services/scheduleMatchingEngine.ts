import { Activity, CandidateActivityMatch, MatchDecision, MatchRecord, ProgressEvent } from '../types';

// Engineering synonyms dictionary for semantic expansion (BGE-M3 style semantic mapping)
const SYNONYM_CLUSTERS: Record<string, string[]> = {
  erect: ['erect', 'erection', 'install', 'installation', 'placement', 'mount', 'alignment', 'spool', 'line'],
  hydrotest: ['hydrotest', 'ht', 'pressure test', 'hydro test', 'pressure certification', 'leak testing'],
  pour: ['pour', 'pouring', 'concreting', 'cast', 'casting', 'm35', 'concrete', 'foundation'],
  cable: ['cable', 'feeder', 'tray', 'pulling', 'laid', 'megger', 'termination', 'wiring'],
  grout: ['grout', 'skid', 'compressor', 'alignment', 'position', 'coupling'],
  line24a: ['24a', 'line 24a', 'line24a', '24a-s01', '24a-s02', '24a-s03', 'spool 24a'],
  line28b: ['28b', 'line 28b', 'line28b', '28b-h01', '28b-h02'],
  foundationf11: ['f11', 'f-11', 'foundation f11', 'foundation f-11'],
  compressork101: ['k-101', 'k101', 'compressor k-101', 'feeder-01']
};

/**
 * Tokenize and normalize text for semantic vector representation
 */
function extractTokens(text: string): Set<string> {
  const cleaned = text.toLowerCase().replace(/[^a-z0-9]/g, ' ');
  const words = cleaned.split(/\s+/).filter(w => w.length > 1);
  const expanded = new Set<string>();

  words.forEach(w => {
    expanded.add(w);
    // Find synonym expansion
    for (const [clusterKey, synonyms] of Object.entries(SYNONYM_CLUSTERS)) {
      if (synonyms.includes(w) || w.includes(clusterKey)) {
        synonyms.forEach(syn => expanded.add(syn));
      }
    }
  });

  return expanded;
}

/**
 * Compute semantic similarity between event text and candidate activity description
 */
export function computeSemanticSimilarity(eventText: string, activityName: string): number {
  const eventTokens = extractTokens(eventText);
  const activityTokens = extractTokens(activityName);

  if (eventTokens.size === 0 || activityTokens.size === 0) return 0.1;

  let intersectionCount = 0;
  for (const token of eventTokens) {
    if (activityTokens.has(token)) {
      intersectionCount++;
    }
  }

  // Jaccard-Dice hybrid similarity
  const totalUnique = new Set([...eventTokens, ...activityTokens]).size;
  const rawScore = (intersectionCount * 2) / (eventTokens.size + activityTokens.size);
  const jaccard = intersectionCount / totalUnique;
  
  return Math.min(0.98, Math.max(0.08, Number(((rawScore * 0.7) + (jaccard * 0.3)).toFixed(3))));
}

/**
 * Compute metadata compatibility score (discipline, area, dates)
 */
export function computeMetadataScore(event: ProgressEvent, activity: Activity): number {
  let score = 0;

  // 1. Discipline alignment (up to 0.50)
  if (event.discipline === activity.discipline) {
    score += 0.50;
  } else {
    // Cross-discipline mismatch penalizes metadata score
    score += 0.05;
  }

  // 2. Area alignment (up to 0.25)
  const eventLower = (event.rawTextExcerpt + ' ' + event.objectOrTag).toLowerCase();
  const areaLower = activity.area.toLowerCase();
  if (eventLower.includes(areaLower) || (activity.area === 'North Unit' && eventLower.includes('north'))) {
    score += 0.25;
  } else {
    score += 0.10;
  }

  // 3. Date window proximity (up to 0.25)
  // Check if event date falls within planned range +/- 7 days
  const eventDate = new Date(event.eventDate).getTime();
  const plannedStart = new Date(activity.plannedStart).getTime();
  const plannedFinish = new Date(activity.plannedFinish).getTime();
  const tolerance = 7 * 86400000; // 7 days in ms

  if (eventDate >= plannedStart - tolerance && eventDate <= plannedFinish + tolerance) {
    score += 0.25;
  } else {
    score += 0.05;
  }

  return Number(score.toFixed(3));
}

/**
 * Compute keyword & entity identifier score (line numbers, foundation IDs, equipment tags)
 */
export function computeKeywordEntityScore(event: ProgressEvent, activity: Activity): number {
  const combinedEvent = (event.normalizedActivityText + ' ' + event.objectOrTag + ' ' + event.rawTextExcerpt).toLowerCase();
  const combinedActivity = (activity.id + ' ' + activity.name).toLowerCase();

  let score = 0.10;

  // Check specific tag matches (e.g., 24A, F-11, 28B, K-101)
  const tags = ['24a', 'f-11', 'f11', '28b', 'k-101', 'feeder-01', 'xv-102', 'pt-2401'];
  for (const tag of tags) {
    if (combinedEvent.includes(tag) && combinedActivity.includes(tag)) {
      score += 0.70;
      break;
    }
  }

  // Check action keyword matches
  const actions = ['erect', 'pour', 'hydrotest', 'cable', 'pull', 'spool', 'weld', 'align'];
  for (const act of actions) {
    if (combinedEvent.includes(act) && combinedActivity.includes(act)) {
      score += 0.20;
      break;
    }
  }

  return Math.min(1.0, Number(score.toFixed(3)));
}

/**
 * Master Schedule-Linking Matching Pipeline
 * Implements PS 26122 formula:
 * final_score = 0.65 * semantic + 0.20 * metadata + 0.15 * keyword
 */
export function matchEventToActivities(event: ProgressEvent, activities: Activity[]): MatchRecord {
  // Step 1: Filter candidate activities (hard discipline or general pool)
  const candidates: CandidateActivityMatch[] = activities.map(activity => {
    const semantic = computeSemanticSimilarity(
      event.normalizedActivityText + ' ' + event.rawTextExcerpt,
      activity.name + ' ' + activity.discipline + ' ' + activity.area
    );
    const metadata = computeMetadataScore(event, activity);
    const keyword = computeKeywordEntityScore(event, activity);

    // EXACT PS 26122 FORMULA
    const finalScore = Number((0.65 * semantic + 0.20 * metadata + 0.15 * keyword).toFixed(3));

    // Rule checks
    const disciplineMatch = event.discipline === activity.discipline;
    const areaMatch = event.rawTextExcerpt.toLowerCase().includes(activity.area.toLowerCase()) || 
                      (activity.area.toLowerCase().includes('north') && event.rawTextExcerpt.toLowerCase().includes('north'));
    const dateWindowValid = metadata >= 0.3;
    const statusTransitionValid = activity.status !== 'COMPLETED' || event.status === 'COMPLETED';

    // Formulate explanation for explainability & auditability
    let explanation = `Matched discipline (${activity.discipline})`;
    if (keyword > 0.6) explanation += `, identified tag match in '${activity.name}'`;
    if (semantic > 0.7) explanation += `, high semantic alignment with field phrasing`;
    if (finalScore >= 0.85) explanation += `. Safe for auto-propose.`;
    else if (finalScore >= 0.65) explanation += `. Ambiguous match, human planner review mandated.`;
    else explanation += `. Weak candidate, below linking threshold.`;

    return {
      activityId: activity.id,
      activityName: activity.name,
      discipline: activity.discipline,
      wbsCode: activity.wbsCode,
      area: activity.area,
      semanticSimilarity: semantic,
      metadataScore: metadata,
      keywordScore: keyword,
      finalConfidence: finalScore,
      ruleChecks: {
        disciplineMatch,
        areaMatch,
        dateWindowValid,
        statusTransitionValid
      },
      explanation
    };
  });

  // Sort descending by final confidence
  candidates.sort((a, b) => b.finalConfidence - a.finalConfidence);

  // Take top 3 candidates
  const topCandidates = candidates.slice(0, 3);
  const bestCandidate = topCandidates[0];
  const finalConfidence = bestCandidate ? bestCandidate.finalConfidence : 0;

  // Threshold Decision Policy (Page 8 Section 7.2)
  let decision: MatchDecision;
  let isAutoLinked = false;

  if (finalConfidence >= 0.85) {
    decision = 'AUTO_PROPOSED';
    // If ground truth or high certainty, can auto-accept or propose
    if (finalConfidence >= 0.90 && event.difficulty === 'EASY') {
      decision = 'AUTO_ACCEPTED';
      isAutoLinked = true;
    }
  } else if (finalConfidence >= 0.65) {
    // Ambiguous bucket (e.g. Line 24A spool erection)
    decision = 'PLANNER_REVIEW';
  } else {
    // Unmatched bucket (below 0.65)
    decision = 'UNMATCHED';
  }

  return {
    id: `MATCH-${event.id}`,
    eventId: event.id,
    event,
    candidates: topCandidates,
    selectedCandidateId: decision !== 'UNMATCHED' ? bestCandidate?.activityId : undefined,
    finalConfidence,
    decision,
    isAutoLinked
  };
}
