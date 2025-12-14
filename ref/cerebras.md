here is its openai base url https://api.cerebras.ai/v1




import os
from cerebras.cloud.sdk import Cerebras

client = Cerebras(
  api_key=os.environ.get("CEREBRAS_API_KEY"),
)

chat_completion = client.chat.completions.create(
  messages=[
  {"role": "user", "content": "Why is fast inference important?",}
],
  model="llama-3.3-70b",
)





available models are
1) zai-glm-4.6 (primary) name to display on model list glm 4.6
2) qwen-3-235b-a22b-instruct-2507 (secondary) name to display on model list qwen3 235b

do not mention providers name