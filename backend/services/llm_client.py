import os
from dotenv import load_dotenv
from litellm import completion

load_dotenv()

def send_to_llm(message: str) -> str:
    response = completion(
        model=os.getenv("GROQ_MODEL"),
        messages=[{"role": "user", "content": message}],
        api_key=os.getenv("GROQ_API_KEY")
    )
    return response.choices[0].message.content