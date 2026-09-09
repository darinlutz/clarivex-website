from transformers import pipeline, AutoTokenizer


def create_simple_llm():
    # GPT-2 model, small at 124M params, fast, understanding
    model_name = "distilgpt2"
    generator = pipeline('text-generation', model=model_name, pad_token_id=50256)
    return generator

generator = create_simple_llm()

prompt = "Once upon a time, there lived a lil nicca, and "

generated_text = generator(prompt, max_length=100, num_return_sequences=1)

print(generated_text[0]["generated_text"])



