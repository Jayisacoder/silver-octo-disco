# Final Demo Rubric

Suggested demo length: **10–12 minutes**

| Area | Evidence | Points |
|---|---|---:|
| Problem & Goals | Clearly explains problem, user, goals, acceptance criteria | 10 |
| Claude Code | Demonstrates repository context and `CLAUDE.md` | 10 |
| Skills | Demonstrates a reusable Skill and explains its purpose | 15 |
| Agents | Explains Lead Agent and specialized agents | 15 |
| Delegation | Shows appropriate subagent delegation | 15 |
| Validation | Shows tests, build, and acceptance evidence | 10 |
| Human Control | Explains and demonstrates approval gates | 10 |
| DevOps | Deploys/verifies application on Vercel | 10 |
| Oral Defense | Explains decisions without depending entirely on AI | 5 |
| **Total** | | **100** |

## Suggested Oral Defense Questions

1. What is the difference between a prompt and a Skill?
2. Why did you create this agent instead of letting the Lead Agent do the work?
3. What information does your subagent need?
4. What information should it not need?
5. What would happen if your Test Agent finds a failure?
6. Why should the Developer Agent not deploy production code?
7. What evidence must exist before deployment?
8. Which environment variables can safely be exposed to the browser?
9. How did you prove the production application works?
10. When would using a subagent be unnecessary?
