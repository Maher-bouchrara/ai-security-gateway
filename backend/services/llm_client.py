import os
from dotenv import load_dotenv
from litellm import completion

load_dotenv()

def send_to_llm(message: str) -> tuple[str, int]:
    """Retourne (réponse, tokens_used)."""
    response = completion(
        model=os.getenv("GROQ_MODEL"),
        messages=[{"role": "user", "content": message}],
        api_key=os.getenv("GROQ_API_KEY")
    )
    text = response.choices[0].message.content
    tokens = response.usage.total_tokens if response.usage else 0
    return text, tokens