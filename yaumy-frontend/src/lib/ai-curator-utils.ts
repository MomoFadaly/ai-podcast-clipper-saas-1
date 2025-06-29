// Utility functions for AI Curator

export const LEARNING_RESOURCE_DATABASES = {
  youtube: [
    { domain: "youtube.com", searchPrefix: "site:youtube.com" },
    { domain: "youtu.be", searchPrefix: "site:youtu.be" }
  ],
  articles: [
    { domain: "medium.com", searchPrefix: "site:medium.com" },
    { domain: "dev.to", searchPrefix: "site:dev.to" },
    { domain: "freecodecamp.org/news", searchPrefix: "site:freecodecamp.org/news" },
    { domain: "towardsdatascience.com", searchPrefix: "site:towardsdatascience.com" },
    { domain: "hackernoon.com", searchPrefix: "site:hackernoon.com" },
    { domain: "css-tricks.com", searchPrefix: "site:css-tricks.com" },
    { domain: "smashingmagazine.com", searchPrefix: "site:smashingmagazine.com" },
    { domain: "blog.logrocket.com", searchPrefix: "site:blog.logrocket.com" }
  ],
  books: [
    { domain: "amazon.com/kindle", searchPrefix: "site:amazon.com kindle" },
    { domain: "goodreads.com", searchPrefix: "site:goodreads.com" }
  ]
};

// Common learning path templates for fallback
export const LEARNING_PATH_TEMPLATES = {
  programming: {
    outcomes: [
      "Understand fundamental programming concepts",
      "Write clean, maintainable code",
      "Build practical projects",
      "Debug and solve problems effectively",
      "Apply best practices in real-world scenarios"
    ],
    resourceTypes: ["video", "article"]
  },
  ai_ml: {
    outcomes: [
      "Understand how AI/ML models work",
      "Use AI APIs and tools effectively",
      "Build AI-powered applications",
      "Apply prompt engineering techniques",
      "Understand AI ethics and limitations"
    ],
    resourceTypes: ["video", "article"]
  },
  business: {
    outcomes: [
      "Master core business concepts",
      "Apply frameworks to real scenarios",
      "Make data-driven decisions",
      "Develop strategic thinking",
      "Lead and manage effectively"
    ],
    resourceTypes: ["video", "article", "book"]
  },
  creative: {
    outcomes: [
      "Develop creative skills and techniques",
      "Build a portfolio of work",
      "Understand design principles",
      "Use industry-standard tools",
      "Express ideas effectively"
    ],
    resourceTypes: ["video", "article"]
  },
  default: {
    outcomes: [
      "Master the fundamentals",
      "Apply knowledge practically",
      "Build real-world projects",
      "Develop problem-solving skills",
      "Continue learning independently"
    ],
    resourceTypes: ["video", "article"]
  }
};

// Query interpretation helpers
export function interpretQueryCategory(query: string): string {
  const lowerQuery = query.toLowerCase();
  
  // AI/ML related
  if (/\b(ai|artificial intelligence|machine learning|ml|neural|gpt|claude|llm|nlp|deep learning|tensorflow|pytorch)\b/.exec(lowerQuery)) {
    return "ai_ml";
  }
  
  // Programming
  if (/\b(programming|coding|javascript|python|java|react|vue|angular|node|web dev|software|api|database|sql)\b/.exec(lowerQuery)) {
    return "programming";
  }
  
  // Business
  if (/\b(business|marketing|finance|management|leadership|strategy|startup|entrepreneur|sales|growth)\b/.exec(lowerQuery)) {
    return "business";
  }
  
  // Creative
  if (/\b(design|art|music|video|photo|creative|ui|ux|graphics|animation|3d|drawing)\b/.exec(lowerQuery)) {
    return "creative";
  }
  
  return "default";
}

// Generate search terms for better results
export function generateSearchTerms(query: string, category: string): string[] {
  const baseTerms = [query];
  
  // Add category-specific terms
  switch (category) {
    case "ai_ml":
      baseTerms.push(
        `${query} tutorial`,
        `${query} explained`,
        `${query} for beginners`,
        `how to use ${query}`,
        `${query} API`,
        `${query} documentation`
      );
      break;
    case "programming":
      baseTerms.push(
        `${query} tutorial`,
        `learn ${query}`,
        `${query} crash course`,
        `${query} for beginners`,
        `${query} best practices`,
        `${query} projects`
      );
      break;
    default:
      baseTerms.push(
        `${query} tutorial`,
        `learn ${query}`,
        `${query} for beginners`,
        `${query} course`,
        `how to ${query}`
      );
  }
  
  return baseTerms;
}

// Fallback resource generation
export function generateFallbackResources(query: string, category: string, skillLevel: string): any[] {
  const resources: any[] = [];
  const resourceTypes = LEARNING_PATH_TEMPLATES[category as keyof typeof LEARNING_PATH_TEMPLATES]?.resourceTypes || LEARNING_PATH_TEMPLATES.default.resourceTypes;
  
  // Generate diverse resource types
  const templates = [
    {
      type: "video",
      titleTemplate: (q: string) => `${q} - Complete Tutorial for ${skillLevel === "beginner" ? "Beginners" : "Developers"}`,
      creator: "YouTube Educator",
      duration: "45 min",
      description: `Comprehensive video tutorial covering ${query} concepts and practical examples`
    },
    {
      type: "documentation",
      titleTemplate: (q: string) => `Official ${q} Documentation`,
      creator: "Official Docs",
      duration: "Self-paced",
      description: `Official documentation and reference guide for ${query}`
    },
    {
      type: "course",
      titleTemplate: (q: string) => `${q} Masterclass`,
      creator: "Online Learning Platform",
      duration: "8 hours",
      description: `In-depth course covering all aspects of ${query} with hands-on projects`
    },
    {
      type: "article",
      titleTemplate: (q: string) => `Understanding ${q}: A Comprehensive Guide`,
      creator: "Tech Blog",
      duration: "20 min read",
      description: `Detailed article explaining ${query} concepts and best practices`
    },
    {
      type: "tutorial",
      titleTemplate: (q: string) => `Build Projects with ${q}`,
      creator: "Tutorial Platform",
      duration: "2 hours",
      description: `Hands-on tutorial building real projects using ${query}`
    }
  ];
  
  // Select appropriate templates based on category
  const selectedTemplates = templates.filter(t => resourceTypes.includes(t.type));
  
  selectedTemplates.forEach((template, index) => {
    resources.push({
      id: `fallback-${index}`,
      title: template.titleTemplate(query),
      creator: template.creator,
      type: template.type,
      url: "",
      duration: template.duration,
      description: template.description,
      difficulty: skillLevel === "beginner" ? "beginner" : "intermediate",
      isFree: true,
      aiReason: "Recommended based on your learning goals and preferences"
    });
  });
  
  return resources.slice(0, 8);
}