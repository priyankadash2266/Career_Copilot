import { SKILLS, type SkillCategory } from "@/lib/data/skills";

export interface ExtractedSkill {
  name: string;
  category: SkillCategory;
}

function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\/]/g, "\\$&");
}

/**
 * Pre-compile one regex per skill at module load (done once, reused for every
 * request). Custom "word boundaries" are needed because \b does not work for
 * skills containing symbols such as "C++", "C#", "CI/CD" or ".NET". A preceding
 * "." is also excluded so the alias "js" does not fire inside "Node.js".
 */
const MATCHERS = SKILLS.map((skill) => {
  const alternatives = skill.aliases
    .slice()
    .sort((a, b) => b.length - a.length) // longest first: "react native" before "react"
    .map(escapeRegex)
    .join("|");
  return {
    skill,
    regex: new RegExp(`(?<![a-z0-9+#.])(?:${alternatives})(?![a-z0-9+#])`, "i"),
  };
});

/**
 * Deterministically extract known skills from resume text.
 *
 * Why not ask the LLM? Rule-based extraction is free, instant, 100%
 * reproducible and easy to unit test. The LLM is reserved for things rules
 * cannot do well (writing feedback). This "hybrid" design is a core AI
 * engineering choice in this project.
 */
export function extractSkills(text: string): ExtractedSkill[] {
  const found: ExtractedSkill[] = [];
  for (const { skill, regex } of MATCHERS) {
    if (regex.test(text)) {
      found.push({ name: skill.name, category: skill.category });
    }
  }
  return found;
}
