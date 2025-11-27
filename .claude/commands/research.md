---
description: Deep research on a topic with throwaway code experiments
allowed-tools: Task, Bash, Read, Write, WebSearch, WebFetch
argument-hint: "<topic> - what to research"
---

# Research: $ARGUMENTS

I'll spawn a research agent to deeply investigate this topic.

## Instructions for Research Agent

Use the `researcher` subagent to investigate the following topic:

**Topic:** $ARGUMENTS

The research agent should:

1. **Create a scratch directory** at `/tmp/claude/research/$TOPIC_SLUG/`
2. **Search the web** for documentation, examples, and prior solutions
3. **Write throwaway code** to test hypotheses and validate understanding
4. **Run experiments** to verify findings work in practice
5. **Iterate** until the topic is well understood
6. **Return a structured summary** with:
   - Brief answer (2-3 sentences)
   - Key findings with code snippets
   - Specific recommendations
   - References consulted

## Context

This research is for the VST audio plugin project. Key technologies:
- Elementary Audio (DSP)
- React (UI)
- JUCE (Native C++)
- TypeScript
- Vite

The research should be practical and actionable for this codebase.

## After Research

Once the researcher agent returns findings:
1. Summarize the key points for me
2. Ask if I want to preserve any scratch code
3. Suggest next steps if applicable
