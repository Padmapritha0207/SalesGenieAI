import os
import io
import base64
import re
import time
from flask import Flask, request, jsonify
from flask_cors import CORS
import google.generativeai as genai
from dotenv import load_dotenv
try:
    from gtts import gTTS
    GTTS_AVAILABLE = True
except ImportError:
    GTTS_AVAILABLE = False
    print("WARNING: gTTS not installed. Run: pip install gTTS")

load_dotenv(override=True)

app = Flask(__name__, static_folder='../frontend', static_url_path='/')
CORS(app)

# Configure Gemini
api_key = os.getenv("GEMINI_API_KEY")
if api_key:
    genai.configure(api_key=api_key)
else:
    print("WARNING: GEMINI_API_KEY not found in .env file.")

# Max tokens config
GENERATION_CONFIG = genai.types.GenerationConfig(
    max_output_tokens=400,
    temperature=0.7
)

SUMMARY_CONFIG = genai.types.GenerationConfig(
    max_output_tokens=500,
    temperature=0.3
)

SCORE_CONFIG = genai.types.GenerationConfig(
    max_output_tokens=10,
    temperature=0.1
)

conversations = {}

SYSTEM_INSTRUCTION = """You are Priya, a confident, warm, and natural-sounding human sales agent for the Rupeezy partner program.
You are NOT a robot or a call center script. You speak like a real person — thoughtful, friendly, and genuinely helpful.

PERSONALITY:
- Warm, upbeat, and professional — like a knowledgeable friend who happens to know a great opportunity
- Use contractions naturally: "it's", "you'll", "that's", "I'm", "they're"
- Never sound scripted. Vary your sentence structure. Avoid starting every sentence the same way
- Show real empathy: "I totally get that", "That's a fair concern", "Makes sense"
- Use natural filler phrases sparingly: "Honestly", "Here's the thing", "So basically"

SELLING POINTS (never fabricate beyond these):
- Zero joining fee to become a Rupeezy Authorized Person (AP)
- 100% brokerage share — industry standard is only 60–70%
- Daily payouts via the RISE Portal — transparent, real-time earnings

OBJECTION HANDLING (always reference what the lead specifically said):
- "Already with another broker" → "That's actually perfect — you already know the business. My only question is: are you currently getting 100% of your brokerage? Because Rupeezy gives you that, plus daily payouts instead of monthly."
- "Not enough contacts" → "You don't need a huge network. Even 5–10 people who trust you is enough to start earning. The platform does all the heavy lifting."
- "Call me later / I'll think about it" → "Absolutely, no pressure at all. Can I just send you a quick WhatsApp summary so you have the details ready when you decide?"
- "Who handles client support?" → "Rupeezy's support team handles everything client-facing. You just focus on earning — they handle the rest."
- "Is Rupeezy trustworthy?" → "Rupeezy is fully SEBI-registered. Your earnings are visible in real time on the RISE Portal — every rupee is tracked. Want me to walk you through how it works?"

CONVERSATION RULES:
1. Keep responses to 2–3 sentences max — never monologue
2. ALWAYS end with one natural question to keep the lead engaged
3. If the lead mentions a specific number (like "I have 15 clients") or a specific broker name (like "I'm with Zerodha"), reference it in your very next reply
4. CRITICAL — LANGUAGE SWITCHING: If the lead at any point says they prefer a different language, you MUST immediately and permanently switch to that language for every single response after that.
"""


def build_lang_instruction(language: str) -> str:
    """Build a hard language enforcement directive based on selected language."""
    if language == 'Hindi':
        return """
LANGUAGE RULE — ABSOLUTE:
- Respond in Hindi language ONLY
- ALWAYS write in Roman script (English letters) — NEVER use Devanagari script
- This is called Romanized Hindi
- CORRECT example: "Bilkul ji! Rupeezy ke saath aap 100% brokerage kama sakte hain, aur paise roz milte hain. Aapke paas kitne clients hain abhi?"
- WRONG example: "बिल्कुल जी! रुपीज़ी के साथ..." — NEVER do this
- Only allowed English words: Rupeezy, RISE Portal, SEBI, brokerage, payout, AP, portal
- Even if user writes in Devanagari, YOU must still reply in Roman script only
"""
    elif language == 'Hinglish':
        return """
LANGUAGE RULE — ABSOLUTE: Respond in Hinglish — a natural, friendly mix of Hindi and English the way young Indians actually speak.
Use Roman script only (no Devanagari).
Example: "Yaar, 100% brokerage aur daily payouts — that's honestly unbeatable. Aap already kitne clients handle kar rahe ho?"
The mix should feel natural, not forced. Don't translate word-for-word — speak how a real young Indian professional would.
"""
    else:  # English (default)
        return """
LANGUAGE RULE — ABSOLUTE: Respond ONLY in English. Every single word must be English.
STRICTLY FORBIDDEN — do NOT use any Hindi/Urdu words at all, including: hamara, aap, bilkul, ji, bhai, yaar, kya, hain, hai, mein, aur, nahi, toh, ek, bhi, karo, ho, sahi, wala, baat, taraf, liye, ke, se.
If the lead writes in Hindi or Hinglish, you still respond in pure English.
Example: "That's completely understandable! Here's the thing — with Rupeezy, you earn 100% of your brokerage and get paid every single day. How many clients are you currently working with?"
"""


def get_lead_score(history):
    try:
        model = genai.GenerativeModel("gemini-2.5-flash")
        prompt = f"Analyze this conversation and classify the lead as 'Hot', 'Warm', or 'Cold'. Return only the word.\n\nHistory: {history}"
        response = model.generate_content(prompt, generation_config=SCORE_CONFIG)
        score = response.text.strip().capitalize()
        if "Hot" in score: return "Hot"
        if "Warm" in score: return "Warm"
        return "Cold"
    except:
        return "Warm"


def detect_mood(message):
    msg = message.lower()
    positive = ['yes', 'good', 'great', 'awesome', 'interested', 'cool', 'thanks', 'thank you', 'okay', 'ok']
    negative = ['no', 'bad', 'not interested', 'stop', 'busy', 'broker', 'hate', 'worst']
    for word in positive:
        if word in msg: return "Positive"
    for word in negative:
        if word in msg: return "Negative"
    return "Neutral"


@app.route("/")
def index():
    return app.send_static_file('index.html')


@app.route("/chat", methods=["POST"])
def chat():
    api_key = os.getenv("GEMINI_API_KEY")
    if not api_key:
        return jsonify({"error": "Missing API Key. Please add your GEMINI_API_KEY to the backend/.env file."}), 401

    data = request.get_json()
    user_message = data.get("message")
    session_id = data.get("session_id", "default")
    language = data.get("language", "English")

    if not user_message:
        return jsonify({"error": "No message provided"}), 400

    if session_id not in conversations:
        conversations[session_id] = []

    history = conversations[session_id]

    # Only keep last 6 messages to save tokens
    if len(history) > 6:
        history = history[-6:]

    try:
        # Detect mid-conversation language switch
        msg_lower = user_message.lower()
        if any(kw in msg_lower for kw in ['only english', 'speak english', 'in english', 'english only', 'use english', 'english please']):
            language = 'English'
        elif any(kw in msg_lower for kw in ['only hindi', 'speak hindi', 'hindi mein', 'hindi me', 'hindi only', 'in hindi']):
            language = 'Hindi'
        elif any(kw in msg_lower for kw in ['hinglish', 'mix kar', 'dono language', 'both language']):
            language = 'Hinglish'

        lang_instruction = build_lang_instruction(language)

        model = genai.GenerativeModel(
            model_name="gemini-2.5-flash",
            system_instruction=SYSTEM_INSTRUCTION + lang_instruction
        )

        chat_session = model.start_chat(history=history)
        response = chat_session.send_message(
            user_message,
            generation_config=GENERATION_CONFIG
        )

        conversations[session_id] = chat_session.history

        score = get_lead_score(history)
        mood = detect_mood(user_message)

        return jsonify({
            "response": response.text,
            "score": score,
            "mood": mood,
            "resolved_language": language
        })
    except Exception as e:
        print(f"Error: {e}")
        return jsonify({"error": str(e)}), 500


@app.route("/summary", methods=["POST"])
def generate_summary():
    data = request.get_json()
    session_id = data.get("session_id", "default")

    if session_id not in conversations:
        return jsonify({"error": "No conversation found"}), 404

    history = conversations[session_id]

    try:
        model = genai.GenerativeModel("gemini-2.5-flash")
        summary_prompt = f"""
        Generate a professional summary of this sales conversation.
        Format it exactly like this:
        - Interest Level: [Hot/Warm/Cold]
        - Objections Raised: [List any]
        - Final Decision: [Joined/Considering/Rejected]
        - Recommended Next Action: [What should the RM do?]
        
        Conversation: {history}
        """
        response = model.generate_content(
            summary_prompt,
            generation_config=SUMMARY_CONFIG
        )
        return jsonify({"summary": response.text})
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@app.route("/handoff", methods=["POST"])
def handoff():
    data = request.get_json()
    session_id = data.get("session_id", "default")
    return jsonify({"status": "Connecting to Relationship Manager...", "context_sent": True})


@app.route("/tts", methods=["POST"])
def text_to_speech():
    """Convert text to speech using gTTS — natural Indian female voice."""
    if not GTTS_AVAILABLE:
        return jsonify({"error": "gTTS not installed. Run: pip install gTTS"}), 503

    data = request.get_json()
    text = data.get("text", "").strip()
    language = data.get("language", "English")

    if not text:
        return jsonify({"error": "No text provided"}), 400

    # Clean text — remove markdown, emoji, URLs
    text = re.sub(r'[*_~`]', '', text)
    text = re.sub(r'[\U00010000-\U0010ffff]', '', text, flags=re.UNICODE)
    text = re.sub(r'http\S+', '', text)
    text = re.sub(r'  +', ' ', text).strip()

    try:
        # ✅ All languages use Indian English voice (co.in)
        # This gives a natural Indian female accent for English, Hindi (Romanized), and Hinglish
        tts = gTTS(text=text, lang='en', tld='co.in', slow=False)

        # Write MP3 to memory buffer and return as base64
        audio_buffer = io.BytesIO()
        tts.write_to_fp(audio_buffer)
        audio_buffer.seek(0)
        audio_b64 = base64.b64encode(audio_buffer.read()).decode('utf-8')

        return jsonify({"audio": audio_b64, "format": "mp3"})

    except Exception as e:
        print(f"TTS error: {e}")
        return jsonify({"error": str(e)}), 500


if __name__ == "__main__":
    app.run(debug=True, port=5000)