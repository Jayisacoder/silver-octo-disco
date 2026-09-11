# Project 3 — AI Software Development Team

## Description

Build a small AI software development team using Claude Code. A Lead Agent coordinates specialized subagents to research, implement, test, and deploy a feature.

## Goals

- move from one coding assistant to specialized agent roles
- create reusable development Skills
- delegate bounded work
- create a dedicated Unit Testing Agent and a separate Test Agent for independent full-suite validation
- require all tests to pass before code commits
- require human approval at critical transitions
- deploy a validated production application to Vercel
- explain the architecture during a live technical demo

## Design your project

- What components and agents does this project need, and why?
- What context and allowed actions will each agent have?
- How will work be delegated and results returned?
- Where will human approval be required, and how will you enforce it?
- How will you test success and failure cases?

Create your own architecture diagram and explain your decisions.

## Example Feature

Build a feedback form containing:

- name
- email
- rating
- comments

Store or process the submission using the project's chosen backend/database.

## Design your workflow

Describe how a feature request becomes a verified release. Define handoffs, failure handling, and the evidence required for implementation and production approval.

## Final Deliverable

The learner shows a working feature and demonstrates how the main agent delegates to specialized subagents without granting uncontrolled production authority.
