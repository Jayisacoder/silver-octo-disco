# Project 2 — AI Help Desk Agent

## Description

Build an AI Help Desk Agent that receives technical support requests, classifies them, delegates troubleshooting to the correct specialized subagent, and exposes a simple web interface deployed to Vercel.

## Goals

- understand agent vs Skill vs subagent
- create reusable troubleshooting procedures
- route problems to specialized agents
- keep agent responsibilities bounded
- return consistent troubleshooting reports
- test routing and output
- deploy the help desk interface to Vercel

## Design your solution

- What components and agents does this project need, and why?
- What context and allowed actions will each agent have?
- How will work be delegated and results returned?
- Where will human approval be required, and how will you enforce it?
- How will you test success and failure cases?

Create your own architecture diagram and explain your decisions.

## Example Request

```text
"My Docker container keeps restarting."
```

Design how this request reaches an appropriate specialist and how its response will be validated and shown to the user.

## Required Safety Boundary

A troubleshooting agent may inspect and recommend.

It should not automatically:

- delete production resources
- rotate credentials
- destroy data
- deploy code
