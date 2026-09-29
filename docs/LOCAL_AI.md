# Local AI & Transcription Setup Guide

## 1. Supported Local AI Runtimes

LocalLecture supports three local AI execution modes:

| Provider | Default Endpoint | Supported Models | Recommended Hardware |
| :--- | :--- | :--- | :--- |
| **Ollama** (Recommended) | `http://127.0.0.1:11434` | `llama3.2`, `mistral`, `qwen2.5`, `phi3` | 8GB+ RAM, optional GPU |
| **llama.cpp** | `http://127.0.0.1:8080` | Any GGUF model via server | 4GB+ RAM |
| **Smart Local Extractor** | In-process | Built-in offline fallback | Any machine (zero deps) |

---

## 2. Setting Up Ollama

### Step 1: Install Ollama
Download and install Ollama from [https://ollama.com/download](https://ollama.com/download).

### Step 2: Pull a Model
Open a terminal and run:
```bash
# Recommended lightweight model (fast & accurate for notes)
ollama run llama3.2

# Or for multilingual / STEM lectures:
ollama run qwen2.5:7b
```

### Step 3: Run Ollama
Ensure the Ollama server is running (default port `11434`).
LocalLecture will automatically detect it and route all study generation prompts through Ollama.

---

## 3. Setting Up Local Whisper Transcription

LocalLecture uses local Whisper to transcribe audio files into timestamped text segments:

### Step 1: Ensure Python is installed
Python 3.10+ is required. Verify with:
```bash
py --version   # Windows
# or
python3 --version
```

### Step 2: Install OpenAI Whisper & PyTorch
```bash
pip install openai-whisper torch
```

*(Optional)* Install FFmpeg if not already present on system PATH for audio decoding:
- Windows: `winget install Gyan.FFmpeg`
- macOS: `brew install ffmpeg`
- Linux: `sudo apt install ffmpeg`

### Step 3: Execution
When a lecture recording finishes, LocalLecture invokes `scripts/transcribe_whisper.py` with the selected model (default: `base` or `small`).
If Python or Whisper is not installed, the application falls back gracefully to its built-in local engine so workflows never crash.
