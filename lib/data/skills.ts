/**
 * Skill taxonomy: the single source of truth for which skills we recognise.
 *
 * Each skill has a canonical name, the aliases people write on resumes,
 * a category (for grouping in the UI) and a rough number of weeks of
 * part-time study needed to become job-ready in it (used by the roadmap).
 *
 * Keeping this as plain data (not code) means adding a skill is a one-line
 * change and never touches business logic (Open/Closed principle).
 */

export type SkillCategory =
  | "Language"
  | "Frontend"
  | "Backend"
  | "Data"
  | "AI/ML"
  | "Cloud/DevOps"
  | "Mobile"
  | "Testing"
  | "Fundamentals"
  | "Product";

export interface SkillDefinition {
  name: string;
  aliases: string[];
  category: SkillCategory;
  learnWeeks: number;
}

export const SKILLS: SkillDefinition[] = [
  // Languages
  { name: "Python", aliases: ["python", "python3"], category: "Language", learnWeeks: 4 },
  { name: "JavaScript", aliases: ["javascript", "js", "es6"], category: "Language", learnWeeks: 4 },
  { name: "TypeScript", aliases: ["typescript", "ts"], category: "Language", learnWeeks: 2 },
  { name: "Java", aliases: ["java", "java 8", "java 17"], category: "Language", learnWeeks: 6 },
  { name: "Go", aliases: ["golang", "go lang"], category: "Language", learnWeeks: 4 },
  { name: "C++", aliases: ["c++", "cpp"], category: "Language", learnWeeks: 6 },
  { name: "C#", aliases: ["c#", "csharp", ".net", "dotnet"], category: "Language", learnWeeks: 5 },
  { name: "Kotlin", aliases: ["kotlin"], category: "Language", learnWeeks: 4 },
  { name: "Swift", aliases: ["swift", "swiftui"], category: "Language", learnWeeks: 4 },
  { name: "SQL", aliases: ["sql", "mysql", "postgresql", "postgres", "t-sql", "pl/sql", "sqlite"], category: "Data", learnWeeks: 3 },
  { name: "Bash", aliases: ["bash", "shell scripting", "powershell"], category: "Cloud/DevOps", learnWeeks: 2 },

  // Frontend
  { name: "React", aliases: ["react", "react.js", "reactjs"], category: "Frontend", learnWeeks: 4 },
  { name: "Next.js", aliases: ["next.js", "nextjs"], category: "Frontend", learnWeeks: 2 },
  { name: "Angular", aliases: ["angular", "angularjs"], category: "Frontend", learnWeeks: 4 },
  { name: "Vue", aliases: ["vue", "vue.js", "vuejs"], category: "Frontend", learnWeeks: 3 },
  { name: "HTML/CSS", aliases: ["html", "css", "html5", "css3", "sass", "scss"], category: "Frontend", learnWeeks: 2 },
  { name: "Tailwind CSS", aliases: ["tailwind", "tailwindcss", "tailwind css"], category: "Frontend", learnWeeks: 1 },
  { name: "Redux", aliases: ["redux", "redux toolkit", "zustand"], category: "Frontend", learnWeeks: 1 },

  // Backend
  { name: "Node.js", aliases: ["node", "node.js", "nodejs"], category: "Backend", learnWeeks: 3 },
  { name: "Express", aliases: ["express", "express.js", "expressjs"], category: "Backend", learnWeeks: 1 },
  { name: "Spring Boot", aliases: ["spring boot", "springboot", "spring framework"], category: "Backend", learnWeeks: 5 },
  { name: "Django", aliases: ["django"], category: "Backend", learnWeeks: 3 },
  { name: "FastAPI", aliases: ["fastapi", "flask"], category: "Backend", learnWeeks: 2 },
  { name: "REST APIs", aliases: ["rest api", "restful", "rest apis", "api design"], category: "Backend", learnWeeks: 2 },
  { name: "GraphQL", aliases: ["graphql"], category: "Backend", learnWeeks: 2 },
  { name: "Microservices", aliases: ["microservices", "microservice", "micro-services"], category: "Backend", learnWeeks: 4 },
  { name: "System Design", aliases: ["system design", "distributed systems", "scalability", "high level design", "hld", "lld"], category: "Fundamentals", learnWeeks: 8 },
  { name: "Kafka", aliases: ["kafka", "rabbitmq", "message queue", "message queues", "pub/sub"], category: "Backend", learnWeeks: 3 },
  { name: "Redis", aliases: ["redis", "memcached", "caching"], category: "Backend", learnWeeks: 1 },
  { name: "MongoDB", aliases: ["mongodb", "mongo", "nosql", "dynamodb", "cassandra"], category: "Data", learnWeeks: 2 },

  // Fundamentals
  { name: "Data Structures & Algorithms", aliases: ["data structures", "algorithms", "dsa", "leetcode", "competitive programming"], category: "Fundamentals", learnWeeks: 10 },
  { name: "Git", aliases: ["git", "github", "gitlab", "version control"], category: "Fundamentals", learnWeeks: 1 },
  { name: "OOP", aliases: ["oop", "object oriented", "object-oriented", "design patterns", "solid"], category: "Fundamentals", learnWeeks: 3 },

  // Cloud / DevOps
  { name: "AWS", aliases: ["aws", "amazon web services", "ec2", "s3", "lambda"], category: "Cloud/DevOps", learnWeeks: 5 },
  { name: "Azure", aliases: ["azure", "microsoft azure"], category: "Cloud/DevOps", learnWeeks: 5 },
  { name: "GCP", aliases: ["gcp", "google cloud", "bigquery"], category: "Cloud/DevOps", learnWeeks: 5 },
  { name: "Docker", aliases: ["docker", "containers", "containerization", "dockerfile"], category: "Cloud/DevOps", learnWeeks: 2 },
  { name: "Kubernetes", aliases: ["kubernetes", "k8s", "helm", "eks", "aks", "gke"], category: "Cloud/DevOps", learnWeeks: 5 },
  { name: "CI/CD", aliases: ["ci/cd", "cicd", "jenkins", "github actions", "gitlab ci", "continuous integration"], category: "Cloud/DevOps", learnWeeks: 2 },
  { name: "Terraform", aliases: ["terraform", "infrastructure as code", "iac", "cloudformation", "ansible"], category: "Cloud/DevOps", learnWeeks: 3 },
  { name: "Linux", aliases: ["linux", "unix", "ubuntu"], category: "Cloud/DevOps", learnWeeks: 2 },
  { name: "Monitoring", aliases: ["prometheus", "grafana", "monitoring", "observability", "datadog", "elk"], category: "Cloud/DevOps", learnWeeks: 2 },

  // Data
  { name: "Excel", aliases: ["excel", "ms excel", "advanced excel", "vlookup", "pivot tables"], category: "Data", learnWeeks: 2 },
  { name: "Power BI", aliases: ["power bi", "powerbi", "dax"], category: "Data", learnWeeks: 3 },
  { name: "Tableau", aliases: ["tableau", "looker", "data visualization", "data visualisation"], category: "Data", learnWeeks: 3 },
  { name: "Pandas", aliases: ["pandas", "numpy", "dataframes"], category: "Data", learnWeeks: 2 },
  { name: "Statistics", aliases: ["statistics", "statistical analysis", "hypothesis testing", "a/b testing", "probability"], category: "Data", learnWeeks: 6 },
  { name: "Spark", aliases: ["spark", "pyspark", "hadoop", "databricks", "big data"], category: "Data", learnWeeks: 4 },
  { name: "ETL", aliases: ["etl", "data pipelines", "airflow", "dbt", "data warehouse", "snowflake"], category: "Data", learnWeeks: 4 },

  // AI / ML
  { name: "Machine Learning", aliases: ["machine learning", "ml", "scikit-learn", "sklearn", "xgboost", "linear regression", "logistic regression"], category: "AI/ML", learnWeeks: 10 },
  { name: "Deep Learning", aliases: ["deep learning", "neural networks", "cnn", "rnn", "transformers"], category: "AI/ML", learnWeeks: 8 },
  { name: "PyTorch", aliases: ["pytorch", "torch"], category: "AI/ML", learnWeeks: 4 },
  { name: "TensorFlow", aliases: ["tensorflow", "keras"], category: "AI/ML", learnWeeks: 4 },
  { name: "NLP", aliases: ["nlp", "natural language processing", "spacy", "nltk"], category: "AI/ML", learnWeeks: 5 },
  { name: "LLMs", aliases: ["llm", "llms", "large language models", "gpt", "openai api", "gemini", "prompt engineering", "generative ai", "genai", "gen ai"], category: "AI/ML", learnWeeks: 4 },
  { name: "RAG", aliases: ["rag", "retrieval augmented generation", "retrieval-augmented generation", "vector database", "vector db", "pinecone", "chromadb", "faiss", "embeddings"], category: "AI/ML", learnWeeks: 3 },
  { name: "LangChain", aliases: ["langchain", "llamaindex", "langgraph", "ai agents", "crewai"], category: "AI/ML", learnWeeks: 2 },
  { name: "MLOps", aliases: ["mlops", "mlflow", "model deployment", "kubeflow", "model monitoring"], category: "AI/ML", learnWeeks: 4 },
  { name: "Computer Vision", aliases: ["computer vision", "opencv", "image processing", "yolo"], category: "AI/ML", learnWeeks: 6 },

  // Mobile
  { name: "Android", aliases: ["android", "android sdk", "jetpack compose"], category: "Mobile", learnWeeks: 6 },
  { name: "iOS", aliases: ["ios", "xcode", "uikit"], category: "Mobile", learnWeeks: 6 },
  { name: "React Native", aliases: ["react native", "expo"], category: "Mobile", learnWeeks: 3 },
  { name: "Flutter", aliases: ["flutter", "dart"], category: "Mobile", learnWeeks: 4 },

  // Testing
  { name: "Unit Testing", aliases: ["unit testing", "jest", "junit", "pytest", "vitest", "mocha", "tdd", "test driven"], category: "Testing", learnWeeks: 2 },
  { name: "Test Automation", aliases: ["selenium", "cypress", "playwright", "test automation", "automation testing", "appium"], category: "Testing", learnWeeks: 4 },

  // Product
  { name: "Agile", aliases: ["agile", "scrum", "kanban", "jira", "sprint"], category: "Product", learnWeeks: 1 },
  { name: "Product Analytics", aliases: ["product analytics", "mixpanel", "amplitude", "google analytics", "funnel analysis"], category: "Product", learnWeeks: 2 },
  { name: "Stakeholder Management", aliases: ["stakeholder management", "stakeholder", "cross-functional", "roadmapping", "prd", "product requirements"], category: "Product", learnWeeks: 3 },
];

const SKILL_INDEX = new Map(SKILLS.map((s) => [s.name, s]));

export function getSkill(name: string): SkillDefinition | undefined {
  return SKILL_INDEX.get(name);
}
