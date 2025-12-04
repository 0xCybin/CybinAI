"""Quick test for LLM connection"""
import asyncio
from app.services.llm import get_llm_provider, LLMMessage
from app.services.llm.base import MessageRole


async def test():
    llm = get_llm_provider()
    print(f"Provider: {llm.provider_name}")
    print(f"Model: {llm.model}")
    print("Sending test message...")
    
    response = await llm.complete([
        LLMMessage(role=MessageRole.USER, content="Say hello in one sentence.")
    ], max_tokens=50)
    
    print(f"Response: {response.content}")
    print(f"Tokens: {response.total_tokens}")
    print(f"Cost: ${response.estimated_cost:.6f}")


if __name__ == "__main__":
    asyncio.run(test())