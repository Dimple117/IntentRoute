"""
utils/translation.py
---------------------
Thin translation layer that lets the (English-only) TF-IDF intent model keep
working unchanged while the voice assistant accepts/replies in other Indian
languages.

Approach:
  1. Student speaks/types in Kannada/Hindi/etc. via the Web Speech API.
  2. We translate that text -> English here.
  3. The existing preprocess_text() + intent model run exactly as before.
  4. The reply message we build in English gets translated back -> the
     student's language, for on-screen display + text-to-speech.

Uses `deep-translator`, trying MyMemoryTranslator first (found to be the
more reliable free backend for Hindi/Kannada in testing), falling back to
GoogleTranslator if MyMemory fails. Every call is wrapped so that if both
translators fail (no internet, service hiccup, unsupported text, etc.) we
just fall back to the original text instead of breaking navigation — the
assistant should degrade gracefully, not crash.
"""

from functools import lru_cache

try:
    from deep_translator import GoogleTranslator, MyMemoryTranslator
    _TRANSLATOR_AVAILABLE = True
except ImportError:
    _TRANSLATOR_AVAILABLE = False

# Languages the voice assistant UI offers. Add more here (and in
# frontend/src/constants.js -> SUPPORTED_LANGUAGES) to support additional
# languages — no other code changes needed.
SUPPORTED_LANGS = {
    "en": "English",
    "hi": "Hindi",
    "kn": "Kannada",
}

DEFAULT_LANG = "en"

# MyMemoryTranslator expects locale-style codes (e.g. "hi-IN") rather than
# the plain ISO codes ("hi") GoogleTranslator uses. Map our short codes to
# the locale form it needs; anything not listed here is passed through as-is.
_MYMEMORY_LOCALE = {
    "en": "en-GB",
    "hi": "hi-IN",
    "kn": "kn-IN",
}


def is_supported(lang: str) -> bool:
    return lang in SUPPORTED_LANGS


def _mymemory_translate(text: str, source: str, target: str) -> str:
    src = _MYMEMORY_LOCALE.get(source, source)
    tgt = _MYMEMORY_LOCALE.get(target, target)
    return MyMemoryTranslator(source=src, target=tgt).translate(text)


def _google_translate(text: str, source: str, target: str) -> str:
    return GoogleTranslator(source=source, target=target).translate(text)


@lru_cache(maxsize=256)
def _cached_translate(text: str, source: str, target: str) -> str:
    """Try MyMemory first (more reliable in practice for hi/kn), fall back
    to Google Translate's wrapper if MyMemory errors out."""
    try:
        return _mymemory_translate(text, source, target)
    except Exception as e1:
        print(f"[translation] MyMemory {source}->{target} failed: {e1}; trying Google...")
        return _google_translate(text, source, target)


def translate(text: str, source: str, target: str) -> str:
    """Translate `text` from `source` -> `target` language code. Returns the
    original text untouched on any failure (offline, empty text, same
    language, translator not installed, both backends failing, etc.)."""
    if not text or not text.strip():
        return text
    if source == target or not _TRANSLATOR_AVAILABLE:
        return text
    try:
        result = _cached_translate(text.strip(), source, target)
        return result or text
    except Exception as e:
        print(f"[translation] {source}->{target} failed on both backends, using original text: {e}")
        return text


def to_english(text: str, lang: str) -> str:
    """Translate a student's spoken/typed query into English so the existing
    intent model (trained on English text) can classify it."""
    if lang in (None, DEFAULT_LANG):
        return text
    return translate(text, source=lang, target=DEFAULT_LANG)


def from_english(text: str, lang: str) -> str:
    """Translate an English response message back into the student's
    selected language, for display + text-to-speech."""
    if lang in (None, DEFAULT_LANG):
        return text
    return translate(text, source=DEFAULT_LANG, target=lang)