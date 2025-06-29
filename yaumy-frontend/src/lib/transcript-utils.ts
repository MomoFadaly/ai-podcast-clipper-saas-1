import type { TranscriptWord } from '~/types/transcript';

export interface TranscriptSentence {
  words: TranscriptWord[];
  startIndex: number;
  endIndex: number;
  startTime: number;
  endTime: number;
}

/**
 * Groups transcript words into sentences based on punctuation and timing
 */
export function groupWordsIntoSentences(words: TranscriptWord[]): TranscriptSentence[] {
  if (!words.length) return [];
  
  const sentences: TranscriptSentence[] = [];
  let currentSentence: TranscriptWord[] = [];
  let sentenceStartIndex = 0;
  
  // Sentence-ending punctuation patterns
  const sentenceEndPattern = /[.!?]$/;
  const abbreviationPattern = /^(Mr|Mrs|Ms|Dr|Sr|Jr|Inc|Ltd|Corp|Co|etc|e\.g|i\.e|vs|Ph\.D|M\.D|B\.A|M\.A|B\.S|M\.S)\.$/i;
  
  words.forEach((word, index) => {
    currentSentence.push(word);
    
    // Check if this word ends a sentence
    const trimmedWord = word.word.trim();
    const endsWithPunctuation = sentenceEndPattern.test(trimmedWord);
    const isAbbreviation = abbreviationPattern.test(trimmedWord);
    const nextWord = words[index + 1];
    
    // Additional heuristics for sentence boundaries
    const hasLongPause = nextWord && (nextWord.start - word.end) > 0.5; // 500ms pause
    const nextStartsWithCapital = nextWord && /^[A-Z]/.test(nextWord.word);
    
    const isSentenceEnd = endsWithPunctuation && !isAbbreviation && 
      (index === words.length - 1 || hasLongPause || nextStartsWithCapital);
    
    if (isSentenceEnd || index === words.length - 1) {
      // Create sentence object
      sentences.push({
        words: [...currentSentence],
        startIndex: sentenceStartIndex,
        endIndex: index,
        startTime: currentSentence[0]?.start ?? 0,
        endTime: word.end,
      });
      
      // Reset for next sentence
      currentSentence = [];
      sentenceStartIndex = index + 1;
    }
  });
  
  return sentences;
}

/**
 * Find the active sentence index based on current time
 */
export function findActiveSentence(
  sentences: TranscriptSentence[], 
  currentTime: number
): number {
  if (!sentences.length) return -1;
  
  // Find the sentence that contains the current time
  const index = sentences.findIndex(sentence => 
    currentTime >= sentence.startTime && currentTime <= sentence.endTime
  );
  
  // If no exact match, find the last sentence that has started
  if (index === -1) {
    for (let i = sentences.length - 1; i >= 0; i--) {
      if (currentTime >= sentences[i]!.startTime) {
        return i;
      }
    }
  }
  
  return index;
}

/**
 * Check if a word is within the active sentence
 */
export function isWordInSentence(
  wordIndex: number, 
  sentence: TranscriptSentence | null
): boolean {
  if (!sentence) return false;
  return wordIndex >= sentence.startIndex && wordIndex <= sentence.endIndex;
}