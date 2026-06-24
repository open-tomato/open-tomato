--
tags: [n8n, credentials, security, best practices, ci-cd, devops]
category: n8n
description: Learn how to securely manage n8n credentials using environment variables and the n8n CLI for programmatic injection, keeping secrets out of your documentation and Git repositories.
--

# Programmatic Credential Injection (n8n CLI)

This method involves creating a **Credential Template** where sensitive values are replaced by **Environment Variables**. This keeps your documentation and Git repo clean of actual secrets.

## 1. Create a Credential Template

Create a file named `credentials-template.json`. Instead of hardcoding keys, use the n8n expression syntax to reference environment variables.

```json
[
  {
    "name": "OpenAI Service",
    "type": "openAiApi",
    "data": {
      "apiKey": "={{$env.OPENAI_API_KEY}}"
    }
  },
  {
    "name": "Postgres Production",
    "type": "postgres",
    "data": {
      "host": "={{$env.DB_HOST}}",
      "database": "n8n",
      "user": "n8n_user",
      "password": "={{$env.DB_PASSWORD}}",
      "port": 5432
    }
  }
]

```

## 2. Set the Environment Variables

On your host machine or within your CI/CD pipeline, export the variables that match the template:

```bash
export OPENAI_API_KEY="sk-..."
export DB_HOST="10.0.0.5"
export DB_PASSWORD="secure_password"

```

## 3. Inject into n8n

Run the import command. If you are using Docker, you must execute this inside the running container.

**For Local/Binary:**

```bash
n8n import:credentials --input=credentials-template.json

```

**For Docker:**

```bash
docker exec -it -u node <container_name> n8n import:credentials --input=/path/to/credentials-template.json

```

---

## 📝 Steps to Reproduce (for GOTCHAS.md)

1. **Define the Schema:** Identify the `type` string for the credential (e.g., `githubApi`).
2. **Prepare the Payload:** Create a JSON array containing the credential configuration using `={{$env.VARIABLE_NAME}}` for sensitive fields.
3. **Provision Environment:** Ensure the target environment has the required variables exported.
4. **Execute Import:** Use the `n8n import:credentials` CLI command to load the JSON into the database.
5. **Verify:** Open the n8n UI; the credentials will appear as "Defined by Environment Variable" and will be ready for use in nodes.

---

## Using BW Secrets Manager CLI

### Authenticate and run the stack with BWS-injected variables
```bash
bws run --project-id $(cat .bw_project_id) -- \
  docker compose -f docker-compose.yaml up -d
```

### Wait for n8n to start, then inject the credential definitions
```bash
docker exec -u node n8n-container-name \
  n8n import:credentials --input=/path/to/credentials-template.json
```

---

## Node+Platform credentials examples

You can find definitions for credentials for popular platforms nodes in the skills files relevant to the nodes that use them. For example, the `SKILLS-n8n-openai.md` file contains a credential definition for the OpenAI node, and the `SKILLS-n8n-github.md` file contains a credential definition for the GitHub node.

---

## Important: The Encryption Key

For this to work across different deployments, you **must** set the `N8N_ENCRYPTION_KEY` environment variable to the same value on every instance.

> [!CAUTION]
> If the `N8N_ENCRYPTION_KEY` changes between the time you import and the time you run a workflow, n8n will be unable to decrypt the credential data.

**Would you like me to show you how to find the internal `type` string for any specific n8n node's credentials?**