# Anthropic Academy — Study Plan & Certification Roadmap
## Target: Claude Certified Architect by April 30, 2026

---

## Overview

The Anthropic Academy (learn.anthropic.com / Skilljar platform) provides structured certification paths for developers and architects building on Claude. The target certification is **Claude Certified Architect**, which validates advanced knowledge of Claude's capabilities, prompt engineering, tool use, multi-agent patterns, and responsible deployment.

**Start date:** Week of March 24, 2026
**Target completion:** April 30, 2026 (5 weeks)
**Study pace:** ~5-6 hours/week

---

## Priority Tier 1 — Core Competencies (Complete First)
*These map directly to what you've already built — fastest path to understanding why it works*

| # | Course | Est. Time | Why It's Relevant |
|---|--------|-----------|-------------------|
| 1 | **Introduction to Claude** | 1 hr | Foundations — models, capabilities, API basics. Start here to formalize what you already know. |
| 2 | **Prompt Engineering Fundamentals** | 2 hrs | You're already doing this in n8n SMS flows and cold call analysis prompts. Understanding the theory sharpens the craft. |
| 3 | **Claude API Essentials** | 1.5 hrs | Directly applies to your OpenAI → Claude migrations and any future direct Claude API calls in the portal. |
| 4 | **Tool Use & Function Calling** | 2 hrs | Your n8n workflows use tool-like patterns. Understanding native tool use opens up richer Claude integrations. |
| 5 | **Working with Long Context** | 1.5 hrs | Applies to call transcript analysis, lead enrichment, and any future document processing you add. |

**Tier 1 Total: ~8 hours | Target: Complete by April 6**

---

## Priority Tier 2 — Advanced Architecture (Core to Certification)
*These are the architect-level concepts that separate builders from architects*

| # | Course | Est. Time | Why It's Relevant |
|---|--------|-----------|-------------------|
| 6 | **Multi-Agent Systems** | 2.5 hrs | Directly maps to your n8n → Claude SMS agent, and the Cold Call Cockpit's AI analysis pipeline. This is what you're already operating. |
| 7 | **Retrieval-Augmented Generation (RAG)** | 2 hrs | Applies to future lead enrichment — pulling contractor data into Claude context before outreach. |
| 8 | **Structured Outputs & JSON Mode** | 1.5 hrs | Your GPT-4 call grading returns structured JSON. Understanding Claude's equivalent opens a migration path. |
| 9 | **System Prompts & Context Windows** | 2 hrs | Critical for the SMS AI in n8n — your Claude 3.5 Haiku prompts live here. Optimizing these improves conversation quality. |
| 10 | **Embeddings & Semantic Search** | 2 hrs | Future use: semantic search across call transcripts, lead notes, or contractor databases. |

**Tier 2 Total: ~10 hours | Target: Complete by April 20**

---

## Priority Tier 3 — Responsible Deployment & Certification Prep
*Required for the Certified Architect designation — covers safety, evaluation, and governance*

| # | Course | Est. Time | Why It's Relevant |
|---|--------|-----------|-------------------|
| 11 | **Evaluating Claude Outputs** | 2 hrs | Directly applies to your AI call grader — formalizes how to measure AI output quality systematically. |
| 12 | **Responsible Scaling & Safety** | 1.5 hrs | Required for certification. Covers responsible deployment of AI in customer-facing contexts (your SMS AI, lead qualification). |
| 13 | **Constitutional AI & RLHF Foundations** | 1.5 hrs | Background on how Claude is trained — helps you understand model behavior and write better system prompts. |
| 14 | **Production Deployment Best Practices** | 2 hrs | Rate limits, error handling, fallback patterns — directly applies to your Telnyx + Claude integrations. |
| 15 | **Claude Certified Architect Exam Prep** | 3 hrs | Practice questions, review of all core domains, exam strategy. |

**Tier 3 Total: ~10 hours | Target: Complete by April 28**

---

## Week-by-Week Schedule

| Week | Dates | Courses | Hours |
|------|-------|---------|-------|
| Week 1 | Mar 24 – Mar 30 | Courses 1–3 (Intro, Prompt Eng, API Essentials) | 4.5 hrs |
| Week 2 | Mar 31 – Apr 6 | Courses 4–5 (Tool Use, Long Context) | 3.5 hrs |
| Week 3 | Apr 7 – Apr 13 | Courses 6–8 (Multi-Agent, RAG, Structured Outputs) | 6 hrs |
| Week 4 | Apr 14 – Apr 20 | Courses 9–10 + begin Tier 3 (Courses 11–12) | 7.5 hrs |
| Week 5 | Apr 21 – Apr 27 | Courses 13–15 (Safety, Deployment, Exam Prep) | 6.5 hrs |
| Buffer | Apr 28 – Apr 30 | Review weak areas, retake any failed sections, schedule exam | 2 hrs |

**Total study time: ~30 hours over 5 weeks (~6 hrs/week)**

---

## Already-Built Features That Map to Certification Domains

| What You've Built | Certification Domain |
|-------------------|---------------------|
| Claude 3.5 Haiku SMS agent in n8n | Multi-Agent Systems, System Prompts |
| GPT-4 call grading in `lib/dialer/ai-analysis.ts` | Evaluating AI Outputs, Structured Outputs |
| Lead qualification scoring | Tool Use, Long Context |
| n8n AI workflow orchestration | Multi-Agent Systems, Production Deployment |
| Cold Call Cockpit AI analysis panel | Tool Use, Evaluating Outputs |
| Telnyx + AI pipeline | Production Deployment Best Practices |

You've already implemented most of what the certification covers. The coursework formalizes and deepens the theory behind what you've built intuitively.

---

## Certification Badge Plan

**Upon completion:** The Claude Certified Architect badge will appear on:
1. LinkedIn profile (Licenses & Certifications section)
2. `homefieldhub.com/credentials` page (replace placeholder with verified badge)
3. Email signature and proposal decks

**Placeholder status:** The credentials page currently shows "Certification in progress — targeting Q2 2026." Replace this once the badge is issued.

---

## Notes

- Course list based on Anthropic Academy curriculum as of March 2026. Verify current course catalog at learn.anthropic.com as new courses are added regularly.
- The Architect certification exam is taken through Skilljar after completing prerequisite courses.
- Study sessions work best in 90-minute blocks — matches Claude's optimal context for complex material.
- If a course has a hands-on lab component, do it against the HomeField Hub codebase — context makes concepts stick faster.
