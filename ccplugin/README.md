# memsearch - Claude Code Plugin

**Automatic persistent memory for Claude Code**

## Installation

```bash
# 1. Set your embedding API key
export OPENAI_API_KEY="sk-..."

# 2. Install memsearch
npm install -g memsearch-ts

# 3. In Claude Code, add the plugin
/plugin marketplace add memsearch
/plugin install memsearch
```

## Architecture

- **4 hooks**: SessionStart, UserPromptSubmit, Stop, SessionEnd
- **1 skill**: memory-recall (context: fork)

## How It Works

1. **SessionStart**: Writes session heading, starts watch
2. **UserPromptSubmit**: Shows "[memsearch] Memory available" hint
3. **Stop**: Summarizes session, appends to daily .md
4. **SessionEnd**: Stops watch process

## Memory Storage

All memories stored in `.memsearch/memory/YYYY-MM-DD.md`
