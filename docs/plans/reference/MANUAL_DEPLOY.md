# Manual Deployment Steps for LXC with AMDGPU

## Prerequisites

- LXC container with AMDGPU passthrough
- Docker and Docker Compose installed
- Network access to clone repositories

---

## Step 1: Clone the Repository

```bash
# Create a working directory
mkdir -p ~/heretek && cd ~/heretek

# Clone heretek-openclaw
git clone https://github.com/Heretek-AI/heretek-openclaw.git
cd heretek-openclaw
```

---

## Step 2: Create the .env File

```bash
# Copy the template
cp .env.example .env

# Edit to set your configuration
nano .env
```

**Key settings to change:**
- `MODEL_PROVIDER=ollama` (local) or `minimax`/`openai` etc.
- `MODEL_NAME=llama3.1` (or your preferred model)

---

## Step 3: Start Docker Compose

```bash
# Pull and start services
docker-compose pull
docker-compose up -d

# Check status
docker-compose ps

# View logs (optional)
docker-compose logs -f litellm
```

---

## Step 4: Pull Ollama Models (if using local)

```bash
# Enter Ollama container
docker exec -it heretek-ollama ollama pull llama3.1

# Also pull embedding model
docker exec -it heretek-ollama ollama pull nomic-embed-text
```

---

## Step 5: Verify LiteLLM is Ready

```bash
# Test health endpoint
curl http://localhost:4000/health

# Should return: {"status":"ok"}
```

---

## Step 6: Access the Admin UI

Open in browser:
- **URL**: http://localhost:4000
- **Username**: admin
- **Password**: heretek-admin (or from .env)

---

## Step 7: Start Agent Containers (Optional)

```bash
# Start all agents
docker-compose -f docker-compose.agent.yml up -d

# Or start specific agent
docker-compose -f docker-compose.agent.yml up -d agent-steward
```

---

## Quick Commands Reference

| Action | Command |
|--------|---------|
| Start services | `docker-compose up -d` |
| Stop services | `docker-compose down` |
| View logs | `docker-compose logs -f` |
| Check status | `docker-compose ps` |
| Restart specific | `docker-compose restart litellm` |
| Pull models | `docker exec heretek-ollama ollama pull <model>` |

---

## Troubleshooting

### GPU Not Visible to Ollama
```bash
# Check if GPU is available
docker exec heretek-ollama nvidia-smi

# If not, ensure container has GPU access in LXC config
```

### LiteLLM Not Starting
```bash
# Check logs
docker-compose logs litellm

# Common fix: wait for postgres/redis
docker-compose restart
```

### Network Issues
```bash
# Check if ports are open
curl http://localhost:4000/health
curl http://localhost:5432
curl http://localhost:6379
```

---

## First Test: Make an LLM Call

```bash
curl http://localhost:4000/v1/chat/completions \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer hk_YOUR_MASTER_KEY" \
  -d '{
    "model": "llama3.1",
    "messages": [{"role": "user", "content": "Hello! Say hello back."}]
  }'
```

Replace `hk_YOUR_MASTER_KEY` with the value from your `.env` file (starts with `hk_`).

---

## Next Steps

1. Run the agent containers: `docker-compose -f docker-compose.agent.yml up -d`
2. Access the LiteLLM admin UI: http://localhost:4000
3. Configure additional models in the LiteLLM admin UI

Let me know once you've completed these steps or if you encounter any issues!