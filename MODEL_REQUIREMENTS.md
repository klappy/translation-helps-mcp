# AI Model Requirements for Translation Helps CLI

## ⚠️ **Important: Model Size Matters**

The quality of responses depends heavily on the AI model's size and capability to follow complex instructions.

## 🔴 **Too Small (Not Recommended)**

### `llama3.2:1b` (1 billion parameters)

- **Problem**: Too small to reliably follow complex instructions
- **Issues**:
  - Ignores system prompts
  - Makes up information despite being told not to
  - Quotes wrong scripture (e.g., says Romans is about creation)
  - Hallucinates even when given correct data
- **Verdict**: ❌ **DO NOT USE for production**
- **Use case**: Only for testing that the CLI starts up

### Example of Failure:

```
You: Show me Romans 1:1
📖 Fetching data for Romans 1:1...
✅ Translation data loaded

AI: "In the beginning, God created humankind..."  ❌ WRONG! (This is Genesis!)
```

## 🟡 **Marginal (May Work)**

### `llama3.2:3b` (3 billion parameters)

- **Status**: Not yet tested, but likely still too small
- **Expected**: Better than 1b, but may still hallucinate
- **Verdict**: ⚠️ **Test before relying on it**

### `qwen2.5:3b` (3 billion parameters)

- **Status**: Not yet tested
- **Expected**: Possibly better instruction following than llama
- **Verdict**: ⚠️ **Worth testing**

## 🟢 **Recommended (Should Work Well)**

### `mistral:7b` (7 billion parameters)

- **Status**: Original target model
- **Problem**: Requires more GPU memory than available on test system
- **Expected**: Should follow instructions reliably
- **Verdict**: ✅ **RECOMMENDED if you have the GPU memory**
- **Requirements**: ~8GB GPU memory

### `llama3.1:8b` or `llama3.2:8b` (8 billion parameters)

- **Status**: Not tested yet
- **Expected**: Should handle complex instructions well
- **Verdict**: ✅ **RECOMMENDED**
- **Requirements**: ~8-10GB GPU memory

### `qwen2.5:7b` (7 billion parameters)

- **Status**: Not tested yet
- **Known for**: Good instruction following
- **Verdict**: ✅ **RECOMMENDED**
- **Requirements**: ~8GB GPU memory

## 💚 **Best (Production Quality)**

### `llama3.1:70b-instruct-q4_K_M` (70 billion parameters, quantized)

- **Status**: Not tested, but should be excellent
- **Expected**: Very reliable instruction following
- **Verdict**: ✅ **BEST if you can run it**
- **Requirements**: ~40GB GPU memory (quantized version)

### `mixtral:8x7b` (47 billion parameters)

- **Status**: Not tested
- **Known for**: Excellent instruction following
- **Verdict**: ✅ **EXCELLENT**
- **Requirements**: ~26GB GPU memory

## 🎯 **Recommendations by Use Case**

### **Testing/Development**

```bash
# If you just want to test the CLI works
ollama pull llama3.2:1b
npm run cli:start -- --model llama3.2:1b

# Warning: Responses will be inaccurate!
```

### **Basic Usage** (Minimum for accurate responses)

```bash
# Recommended minimum for actual translation help
ollama pull mistral:7b
npm run cli:start -- --model mistral:7b

# Alternative if Mistral doesn't work
ollama pull qwen2.5:7b
npm run cli:start -- --model qwen2.5:7b
```

### **Production Use** (Best quality)

```bash
# If you have the GPU memory (40GB+)
ollama pull llama3.1:70b-instruct-q4_K_M
npm run cli:start -- --model llama3.1:70b-instruct-q4_K_M

# Medium option (26GB)
ollama pull mixtral:8x7b
npm run cli:start -- --model mixtral:8x7b
```

## 🔧 **What If I Don't Have Enough GPU Memory?**

### Option 1: Use CPU Mode (Slow but works)

See [`force-cpu-ollama.md`](force-cpu-ollama.md) for instructions.

**Pros:**

- Works with any model size
- No GPU required

**Cons:**

- 10-30x slower than GPU
- Mistral:7b will take 30-60 seconds per response

### Option 2: Use OpenAI (Requires Internet + API Key)

```bash
export OPENAI_API_KEY=your-key
npm run cli:start -- --provider openai
```

**Pros:**

- Very fast responses
- Excellent instruction following
- No local hardware requirements

**Cons:**

- Requires internet connection
- Costs money per request (~$0.001 per query)
- Not private (data sent to OpenAI)
- Defeats the offline-first purpose

### Option 3: Use a Cloud GPU

- **Vast.ai**: Rent GPU by the hour (~$0.20-0.50/hour)
- **RunPod**: Similar GPU rental service
- **Google Colab**: Free tier with GPU access

## 📊 **Performance Comparison**

| Model        | Size     | Accuracy     | Speed (GPU)  | Speed (CPU)       | GPU Memory |
| ------------ | -------- | ------------ | ------------ | ----------------- | ---------- |
| llama3.2:1b  | 1B       | ❌ Poor      | ⚡ Very Fast | 🐢 Slow           | 2GB        |
| llama3.2:3b  | 3B       | ⚠️ Fair      | ⚡ Fast      | 🐢 Very Slow      | 4GB        |
| mistral:7b   | 7B       | ✅ Good      | ⚡ Fast      | 🐌 Extremely Slow | 8GB        |
| llama3.1:8b  | 8B       | ✅ Good      | ⚡ Fast      | 🐌 Extremely Slow | 10GB       |
| qwen2.5:7b   | 7B       | ✅ Good      | ⚡ Fast      | 🐌 Extremely Slow | 8GB        |
| mixtral:8x7b | 47B      | ✅ Excellent | 🔶 Medium    | 💀 Unusable       | 26GB       |
| llama3.1:70b | 70B (Q4) | ✅ Excellent | 🔶 Medium    | 💀 Unusable       | 40GB       |

## 🧪 **Testing Your Model**

Try this test query:

```
You: Can you teach me to translate Romans 1:1?
```

**✅ Good Response** (Model is working):

```
AI: Here's Romans 1:1 from the ULT:
"Paul, a servant of Jesus Christ, called to be an apostle,
set apart for the gospel of God"
[Correctly quotes the actual verse]
```

**❌ Bad Response** (Model is too small):

```
AI: Here's Romans 1:1:
"In the beginning, God created humankind in his own image..."
[This is Genesis 1, not Romans 1 - hallucination!]
```

## 💡 **My System Can't Run Larger Models - What Now?**

If you're limited to small models (1b-3b):

1. **Acknowledge the Limitations**
   - Small models WILL make mistakes
   - Always verify scripture quotes
   - Cross-check with online resources

2. **Use for Learning Only**
   - Good for understanding the translation PROCESS
   - Good for exploring what resources exist
   - BAD for trusting specific content

3. **Consider Alternatives**
   - Use the web UI instead (runs on Cloudflare, no local GPU needed)
   - Use OpenAI provider (more accurate, requires internet)
   - Upgrade hardware or use cloud GPU

4. **Help Improve the System**
   - Report which models work well
   - Share your findings
   - Contribute better prompting techniques

## 🔜 **Future Improvements**

Planned features to work with smaller models:

1. **Response Validation**
   - Check if AI's scripture quote matches fetched data
   - Alert user if model is hallucinating
   - Offer to re-generate with stricter prompt

2. **Forced Format Responses**
   - Pre-structure the response template
   - AI only fills in specific fields
   - Less room for hallucination

3. **RAG-only Mode**
   - Skip AI interpretation entirely
   - Just format and display the Door43 data
   - No risk of hallucination

## 📚 **Resources**

- **Ollama Model Library**: https://ollama.com/library
- **Model Comparison**: https://ollama.com/library/llama3.2
- **GPU Requirements**: https://github.com/ollama/ollama/blob/main/docs/gpu.md

---

**TL;DR**: Use **mistral:7b** or larger. The **llama3.2:1b** model is too small and will give incorrect answers despite having the correct data!
