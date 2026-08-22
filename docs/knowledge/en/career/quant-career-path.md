---
title: "Quant Career Path"
description: "For STEM/finance backgrounds who want to break into quant. This article is about how to get a job at a quant firm, not how to trade systematically — for that, see [Quant Practice](../quant-practice/)"
---

# Quant Career Path

> Written for **people with STEM/finance backgrounds who want to enter the quant industry**. This article covers how to land a job at a quant institution, not how to trade with a systematic strategy — for the latter, see [Quant Practice](../quant-practice/).
>
> The quant industry has been one of the fastest-expanding tracks in finance over the past decade: entry-level salaries at top funds have long ranked in the market's first tier (actual market conditions prevail), and what comes with it is **<mark>an extremely high bar and an extremely low acceptance rate</mark>**. This article explains roles, skills, resumes, interviews, channels, and transition realities in one pass — no motivational fluff.


---

## Roles in the Quant Industry

| Direction | Representative firms (public common knowledge) | Work | Salary structure basics |
|---|---|---|---|
| Buy-side · quant funds | Top names like Ubiquant (Jiukun), High-Flyer, Minghong, Yanfu; plus many small and mid-sized funds | Developing and iterating strategies (factors, machine learning, CTA, high-frequency), managing live capital; performance directly drives bonus | Base salaries rank near the top across industries (from hundreds of thousands to millions RMB); bonuses are a large share and highly volatile, with huge gaps between top and mid-tier firms |
| Buy-side · proprietary desks | Broker prop desks, futures prop desks, bank prop (some) | Trading with your own or the firm's money, no external client pressure, pursuing absolute returns | Fixed salary + performance commission; aggressive prop shops offer large bonus upside |
| Sell-side · financial engineering | Financial engineering teams at major broker research institutes | Writing research reports (factor stock selection, derivatives pricing, weekly quant notes), serving institutional clients like mutual funds and insurers — this is "sell-side service", not direct profit-making | Broker compensation system (base + bonus); top brokers pay better than average ones but generally below top buy-side funds |
| Foreign firms | Two Sigma, Citadel and other firms operating in China (subject to actual public information) | Equal weight on research and development; more internationalized processes and standards; some roles involve postings / full English | Tied to global systems; overall pay sits at the very top of the industry, though China-region dynamics have shifted considerably in recent years |

::: info 📖 Buy-side vs Sell-side
**One-line distinction between <mark>buy-side vs sell-side</mark>**: the buy-side makes money with its own capital (profits go to itself/its clients); the sell-side trades research for commissions (serves clients to make money). The buy-side is judged by performance; the sell-side by reputation and service quality.
:::

---

## Skill Stack Requirements

Whether buy-side or sell-side, core skills for quant roles fall into four blocks:

### Mathematics

- Probability theory and mathematical statistics (random variables, distributions, hypothesis testing, regression) — **the foundation under the foundation**; about 60% of interview questions come from here.
- Linear algebra (matrix operations, eigenvalues, covariance) — the language of factor models and portfolio optimization.
- Calculus and introductory optimization — used for solving strategy parameters.

### Programming

- **<mark>Python is mandatory</mark>**: pandas/numpy data processing, multiprocessing, unit testing, code standards. Research roles use Python almost exclusively.
- **C++ is a plus**: high-frequency/low-latency roles require C++, and it's essential for developer roles — for research roles it's "you can get in without it, but you're stronger with it".
- SQL, Git, and basic Linux operations are assumed.

### Machine Learning

- From classic models (linear regression, decision trees/GBDT, clustering) to deep learning (applying CNN/LSTM/Transformer to factors, depending on the firm).
- The core is "**<mark>solving financial problems with machine learning</mark>**": feature engineering, overfitting prevention, out-of-sample validation — far more important than knowing how to tune hyperparameters.
- Market directions: fundamental factors, price-volume factors, CTA (trend/cross-section), statistical **<mark>arbitrage</mark>**.

### Finance Knowledge

- Derivatives pricing basics (Black-Scholes formula, Greeks), trading rules (price limits, T+1, **<mark>margin</mark>**), market microstructure (order book, impact cost).
- The knowledge barrier for finance is relatively low compared to math and programming, and can be filled after joining — **<mark>most institutions prioritize math and programming in assessments</mark>**.

### Skill Self-Assessment Table

| Skill | Beginner (can apply for internships) | Competent (can apply for campus recruiting) | Proficient (can apply for full-time research/dev) | My status |
|---|---|---|---|---|
| Probability/statistics | Can compute expectations, variance, common distributions | Random variable transformations, CLT, hypothesis testing | Stochastic processes (random walks/Markov/Brownian motion) | ☐ |
| Linear algebra | Can do matrix operations | Eigendecomposition, covariance matrices | Expressing portfolio optimization with matrices | ☐ |
| Python | Can write scripts, basic pandas | Can independently complete data cleaning and strategy computation | Engineering: classes, tests, performance optimization | ☐ |
| C++ (bonus) | Never written it | Can write simple programs | Understands memory model, can write low-latency components | ☐ |
| Machine learning | Knows names of common models | Can run classification/regression end-to-end with sklearn | Can design features, evaluate overfitting, do out-of-sample validation | ☐ |
| Finance knowledge | Knows what stocks/futures/options are | Can read candlestick charts, understands T+1/margin | Can derive Black-Scholes, understands market microstructure | ☐ |
| Projects | None | One complete backtest project | A reproducible research repo on GitHub (with report) | ☐ |
| Competitions | None | Participated in Kaggle/simulated competitions | Verifiable rankings or model-performance evidence | ☐ |

> Self-assessment rule: **check off every row before applying — far more effective than blindly mass-applying**. The vast majority of campus-recruiting candidates fail on "can't solve probability problems + can't explain their projects clearly".

::: tip Where Campus Recruiting Fails
**The vast majority fail on "can't solve probability problems + can't explain their projects clearly"**. These are the two most honest gates in quant job hunting; no resume polish gets you past follow-up questions.
:::

### Time Estimates for Skill Preparation (common-knowledge ranges)

| Starting point | To "internship-ready" | To "campus-recruiting-ready" | Notes |
|---|---|---|---|
| Math/statistics major | 1-3 months to pick up Python | 6-12 months (projects + ML) | Math is your home turf; fill in engineering |
| Computer science major | 2-4 months to pick up probability/statistics | 6-12 months (statistical intuition + projects) | Programming is your home turf; fill in math |
| Finance background | 3-6 months to pick up programming | 12-24 months (the gap is mostly math) | You have the finance knowledge; both math and programming need filling |
| Pure cross-discipline | 6-12 months | 18-36 months (long-termism required) | Longest timeline; prioritize the competition + project route |

::: tip 💡 Preparation Time Depends on Effective Hours
Time estimates are reference only: **<mark>what determines progress is not the calendar but effective study hours</mark>** (roughly assuming 10-20 effective hours per week). Ignore any pitch promising "quant in three months".
:::

---

## Resume & Projects: What If You Have No Internship

No internship is the first hurdle for most cross-discipline applicants. Alternatives:

### Personal Quant Project (Most Recommended)

- Build a **complete <mark>backtesting</mark> framework or factor research repository**, published on GitHub: README explaining your approach, data-fetching code, visualizations, and a conclusions report.
- What matters isn't flashy code but whether you **can explain it clearly**: what assumptions you made, how you prevented look-ahead bias, how you validated out-of-sample, how to interpret the results.
- Reference directions: dual moving average/Bollinger Band backtests (see [Quant Practice](../quant-practice/)), factor effectiveness research (IC/IR), pairs trading, CTA trend following.

### Kaggle / Quant Competitions

- Kaggle finance competitions (e.g., the Optiver series): prove your "machine learning + financial data" ability; even a modest ranking has resume value.
- **WorldQuant BRAIN**: a free-to-register simulated quant platform where you can produce "alpha research reports" — one of the better-recognized "amateur portfolios" among Chinese quant funds.
- Simulated trading competitions hosted by brokers/exchanges/universities: a ranking is an excellent door-opener.

### Open Source Contributions / Blogging

- Submit PRs and file issues on open-source quant libraries (backtrader, vn.py, klinecharts, etc.).
- Publish strategy research articles on WeChat/Zhihu/CSDN — **interviewers actually read them**; content quality matters more than follower count.

### Resume Writing Points

- Put your tech stack somewhere visible; describe projects in three parts: "**what you did → how you did it → what the result was**".
- Don't write "expert"; write "used X to solve Y in scenario Z".
- Be careful with **<mark>return-rate</mark>** numbers: unverified return records can backfire; state the backtest period and assumptions.

---

## Interview Process & Common Questions

| Stage | Content | Advice |
|---|---|---|
| Written test | Probability + coding questions (mostly LeetCode medium) + financial math at some firms | Grind problems; probability relies on long-term accumulation |
| First round (fundamentals) | Probability/statistics/coding basics; deep-dive into resume projects | You must be able to talk through each project's details for 30 minutes |
| Second round (strategy) | Design a strategy/factor for a given scenario; discuss overfitting and decay | Show your thinking process, not standard answers |
| Final round | Culture fit, stress tolerance, career plans, behavioral questions | Be sincere; don't fabricate experiences |

### High-Frequency Question Types (Public Regulars)

- **Coin-flip expectation**: e.g., "expected number of flips until heads", "flips needed for two consecutive heads" — tests geometric distribution and Markov chains.
- **Random walks**: "does a random walk return to its origin?", "gambler's ruin" — tests stochastic-process intuition.
- **Monte Carlo**: describe/implement using random simulation to estimate expectations or price derivatives.
- **Classic paradoxes**: Monty Hall, birthday paradox — tests whether you've "seen the world".
- **Behavioral**: "why quant?", "how much **<mark>drawdown</mark>** can you tolerate?", "what do you think when a strategy stops working?"

> Plenty of public interview write-ups and solutions exist online; systematically work through material at the level of "100 probability problems". **<mark>The math depth tested in quant interviews isn't deep, but it must be fast and accurate.</mark>**

::: tip The Truth About Quant Interviews
**The math depth tested isn't deep, but it must be fast and accurate.** This isn't selecting math geniuses; it's screening for people who can think while articulating and stay composed under pressure.
:::

### Three Classic Problems Walked Through (Public Questions, For Self-Testing)

| Problem | Approach | Answer |
|---|---|---|
| Fair coin: expected flips until first heads | Geometric distribution, expectation = 1/p | 2 |
| Expected flips until "heads-heads" appears consecutively | Set up an expectation equation (Markov state transitions) or recurrence, E = expected value | 6 |
| Symmetric ±1 random walk from 0: probability of ever hitting +1 | Martingale/unconditional symmetry analysis; symmetric random walks return to origin almost surely, and hit any integer | 1 |

- Question 1 tests whether you know the geometric distribution; question 2, whether you can set up a state equation; question 3, stochastic-process intuition — **most interview questions reduce to these three types**. Master the ideas before grinding.
- Prepare coding questions at LeetCode medium difficulty; focus on "**writing it correctly, writing it fast, explaining the complexity clearly**". No need to obsess over exotic hard problems.

### High-Frequency Behavioral Questions

- "Why switch from your original industry to quant?", "why our firm?" — do your homework; be able to cite the firm's publicly known strategic direction and style.
- "Your most failed project/worst losing trade" — **tests attribution ability**: explain objective causes and improvements, without blame-shifting or self-deprecation.
- "How much drawdown can you take?", "what if a strategy fails?" — demonstrate "**<mark>a stop-loss-and-iterate mechanism</mark>**", not a "I can tough it out" attitude.

---

## Job Hunting Channels

| Channel | Characteristics | Advice |
|---|---|---|
| Internship conversion | The main full-time pipeline at top institutions; formal-track acceptance rates are extremely low | Prioritize summer/long-term internships; on-the-job performance during internships counts more than credentials |
| Community referrals | Referrals via WeChat accounts, paid communities, GitHub circles convert far better than mass applications | Produce work first (projects/articles) so referrals carry weight |
| Headhunters | Suited for job-hopping with 1-2 years' experience; rare for fresh graduates | Keep in touch; don't trust verbal promises of "high pay" |
| Official channels | Company sites, Niuke, campus talks | Don't rely on a single channel; run several in parallel |

::: warning ⚠️ The Reality of Campus Recruiting Quotas
Reality check: **<mark>top quant funds hire only single-digit to low double-digit new graduates per year, and most headcount goes to internship conversions</mark>**. For most people, "smaller fund first → build track record → move to a top firm" is more realistic than landing a top fund in one shot.
:::

---

## Transition Realities: How Intense Is the Competition

- **<mark>Acceptance ratio</mark>**: resume-to-offer ratios in campus recruiting at top quant firms are typically around one percent or lower (range of public discussion; actual market conditions prevail); internship-conversion slots are just as scarce.
- **Who you're competing against**: math, physics, and CS masters/PhDs from top Chinese universities (Tsinghua/Peking/Fudan/SJTU) and overseas schools form the main pool; most have "relevant degree + internship"; cross-discipline applicants need stronger portfolios to compensate.
- **Beyond the halo**: top-fund salaries come with high pressure — strategies get cut when they decay, performance reviews loom, and layoffs/restructuring uncertainty is constant; smaller firms pay ordinarily but with friendlier pace and faster learning.
- **Cycle effects**: the quant industry correlates strongly with market conditions and fundraising environment (hiring contracts during downturns and regulatory tightening); **supply and demand swing sharply with cycles**.
- **Long-termism required**: from "can write strategies" to "got hired" typically takes years of preparation; many people prepare two to three years for their first offer, and many fail and return to their original industry — that's normal. Decide your stop-loss line in advance.

### Fresh Graduates / Experienced Hires / Interns: Different Plays Per Stage

| Stage | Your competitors | Play |
|---|---|---|
| In school (fresh grad) | Elite-degree peers with internships | Run competitions, projects, and internships in parallel; grab a smaller-firm internship first |
| Already employed (experienced hire) | Experienced candidates | Win on "verifiable projects + skill depth" rather than degrees; invest weekends, expect a longer runway |
| No degree but has work | Proof-first | WorldQuant BRAIN reports, GitHub repos, competition rankings are the main weapons |
| Internship conversion | Same cohort of interns | Solid delivery + proactive output during the internship matters more than credentials |

::: warning ⚠️ If Employed, Don't Quit to Gamble
Realistic advice for the employed: **<mark>keep your job and treat job hunting as your "second evening job"</mark>** — the upside of quant job hunting is switching tracks if you succeed; the cost is months to years of spare time. Don't stake resignation on it.
:::

### Common Misconceptions

- Believing in "certificates": CFA/FRM carry far less weight in quant research hiring than "can solve problems, can code, has projects".
- Neglecting data skills: SQL, data cleaning, reconciliation mismatches — research roles spend much of their day on data engineering, and interviews often test it.
- Only reading interview write-ups without writing code: passing the written test but failing round two usually means "projects that can't survive follow-ups".
- Applying only to top firms: for every hire at a top firm, ten get hired at mid-tier ones; get in first, then advance.

### Job Hunting FAQ

| Question | Answer |
|---|---|
| Can I get into quant without a top-school degree? | Yes, but let your work speak: at least two of — competition ranking, BRAIN reports, open-source projects, internships |
| Average math but strong coding — which track? | Developer roles (quant dev/systems engineer) demand less math than research roles; engineering ability is the ticket in |
| Is a master's degree mandatory? | Common-knowledge range: top-firm research roles mostly start at master's level, but developer roles and smaller firms are far more forgiving |
| Is quant a young person's game? | Both research and development careers are long-lasting; the "experience appreciates with age" shows up in strategy understanding and system architecture |
| Is not knowing C++ disqualifying? | Not for research roles; yes for developer roles. Different directions — no need to panic |
| Is it too late to start preparing now? | Quant is ability-driven; there's opportunity whenever you start. But if you've worked many years with no relevant accumulation, validate your commitment and cost-effectiveness part-time first |

---

## Risk Warning

::: warning ⚠️ Risk Warning
Quant job hunting is a textbook high-barrier, high-competition track with heavy survivorship bias. **The high-salary stories circulating online concentrate on top roles at top firms and do not represent the average**; getting in doesn't mean stability — the quant industry also sees layoffs, strategy decay, and performance-review pressure (actual market conditions prevail). All salary figures and acceptance ratios here are public common-knowledge ranges; defer to actual market and company conditions. Treat "preparing for the job hunt" as an investment in your own skills — even if you never enter quant, probability/statistics and programming abilities don't depreciate in the job market.
:::
