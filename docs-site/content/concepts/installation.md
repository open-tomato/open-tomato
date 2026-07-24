---
title: "Installation"
category: concepts
slug: installation
order: 2
lead: "Get the Open Tomato CLI and workspace set up in a couple of minutes."
source: null
editHref: null
---

## Prerequisites

Open Tomato targets **Bun 1.3+** and **Node 22**. The CLI is published to the
Open Tomato registry as `@open-tomato/cli`.

## Install the CLI

```bash
npm install -g @open-tomato/cli
```

Verify the install:

```bash
tomato --version
```

## Seed a workspace

```bash
tomato init
```

This writes an `open-tomato.config.json` to the current directory. See
[Configuration](/concepts/configuration) for what goes in it.

