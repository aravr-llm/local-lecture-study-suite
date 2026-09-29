"""
Local Whisper Speech-to-Text CLI Helper.
Executes transcription completely on device using openai-whisper or faster-whisper.
"""
import sys
import os
import json

def main():
    if len(sys.argv) < 2:
        print("Usage: python transcribe_whisper.py <audio_path> [language]")
        sys.exit(1)

    audio_path = sys.argv[1]
    language = sys.argv[2] if len(sys.argv) > 2 else "en"

    if not os.path.exists(audio_path):
        print(f"Error: audio file not found at {audio_path}", file=sys.stderr)
        sys.exit(1)

    try:
        import whisper
    except ImportError:
        print("Error: openai-whisper is not installed. Run: pip install openai-whisper", file=sys.stderr)
        sys.exit(1)

    print(f"Loading local Whisper model...", file=sys.stderr)
    model = whisper.load_model("base")

    print(f"Transcribing {audio_path} locally...", file=sys.stderr)
    result = model.transcribe(audio_path, language=language)

    # Output JSON directly to stdout
    print(json.dumps({
        "text": result.get("text", ""),
        "language": result.get("language", language),
        "segments": [
            {
                "start": seg.get("start", 0.0),
                "end": seg.get("end", 0.0),
                "text": seg.get("text", "").strip(),
            }
            for seg in result.get("segments", [])
        ]
    }))

if __name__ == "__main__":
    main()
