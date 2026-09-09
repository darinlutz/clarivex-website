from transformers import pipeline, GenerationConfig


def create_simple_llm():
    # GPT-2 model, small at 124M params, fast, understanding
    model_name = "distilgpt2"
    generator = pipeline('text-generation', model=model_name)
    return generator

generator = create_simple_llm()

generation_config = GenerationConfig(
    max_new_tokens=256,
    pad_token_id=generator.tokenizer.eos_token_id,
)

prompt = "Once upon a time, there lived a lil nicca in the ghetto, and "



generated_text = generator(
    prompt,
    generation_config=generation_config,
    clean_up_tokenization_spaces=False,
)

print(generated_text[0]["generated_text"])



