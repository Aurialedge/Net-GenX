"""
Layer 1 - Intent & Elicitation Analysis.

Humanised AI bots rarely ask "send me the deployment map". They use the classic
HUMINT elicitation techniques (flattery, assumed knowledge, bracketing, feigned
ignorance, quid-pro-quo...) wrapped around a *target* information category.
This layer scores (technique x target) and infers the actor's primary intent.
"""
import re

from preprocessor import normalize, LEXICON_RE, URL_RE, DROPPER_RE
from .common import layer_result, rx, count_matches, noisy_or

TECHNIQUES = {
    "flattery": rx(r"\b(?:handsome|dashing|brave|inspiring|admir\w+|hero|so (?:smart|disciplined|different)|incredible dedication|truly admirable|you must be (?:so|very) (?:brave|important|senior))\b"),
    "rapport_building": rx(r"\b(?:i (?:completely|totally|truly) understand|i can only imagine|means a lot|i feel (?:a )?(?:real )?connection|we (?:have|share) so much|trust each other|i value (?:our|the trust)|you can trust me|i'?m here for you)\b"),
    "assumed_knowledge": rx(r"\b(?:as you (?:know|must know)|i (?:heard|read|know) (?:that )?your (?:unit|regiment|battalion|brigade)|everyone knows your|since you(?:'re| are) (?:in|with) the)\b"),
    "bracketing": rx(r"\b(?:is it (?:around |about )?\d+ or \d+|between \d+ and \d+ (?:troops|men|tanks|guns|personnel)|more (?:or|than) less than \d+)\b"),
    "false_statement_probe": rx(r"\b(?:i read (?:that|somewhere)|isn'?t it true that|i heard .{0,40}(?:deployed|moved|posted)|right\?$|correct me if i'?m wrong)\b"),
    "feigned_ignorance": rx(r"\b(?:i'?m (?:just )?(?:a student|curious|a (?:military|defence|defense) enthusiast|new to this)|i (?:don'?t|do not) know much about|out of (?:pure )?curiosity|just curious|for (?:general knowledge|my project|my thesis|research))\b"),
    "quid_pro_quo": rx(r"\b(?:i'?ll (?:tell|show|send) you if|i (?:shared|sent) (?:mine|my photo)|your turn|in return|i(?:'ll| will) pay (?:you|for)|reward you)\b"),
    "secrecy_request": rx(r"\b(?:keep (?:this|it) (?:between us|secret|private)|don'?t tell (?:anyone|your)|i won'?t tell anyone|delete (?:this|the) (?:chat|message)|our little secret)\b"),
    "channel_shift": rx(r"\b(?:add me on|(?:move|switch|shift) to (?:telegram|signal|whatsapp|snapchat|instagram)|insta(?:gram)?\s*[:@]|telegram\s*[:@]|dm me|text me on|my (?:number|id) is)\b"),
    "authority_impersonation": rx(r"\b(?:this is (?:from )?(?:hq|headquarters|signals branch|ms branch|the ministry|cert.?army|it cell)|by order of|official (?:notice|order|communication)|on behalf of (?:the )?(?:army|ministry|command))\b"),
    "urgency_pressure": LEXICON_RE["urgency"],
    "sympathy_hook": rx(r"\b(?:i feel (?:so |very )?lonely|nobody understands me|i'?m going through|please help me|my (?:mother|father) is (?:sick|in hospital)|i need (?:money|help) urgently)\b"),
    "coercive_leverage": LEXICON_RE["coercion"],
    "veiled_threat": LEXICON_RE["veiled_threat"],
}

TARGETS = {
    "location": rx(r"\b(?:where (?:are|is) (?:you|your)\w*|posted (?:at|in|near)|stationed|which (?:base|station|post|cantt|cantonment|sector)|live location|located|your (?:camp|post|base|quarters|location)|coordinates|grid ref\w*)\b"),
    "unit_identity": rx(r"\b(?:which (?:unit|regiment|battalion|squadron|brigade|corps|formation)|your (?:unit|regiment|battalion|squadron|brigade|formation|co)\b|unit part of)"),
    "movement_schedule": rx(r"\b(?:when (?:is|are|will) (?:you|your|the)\w* (?:mov\w+|go\w*|leav\w+|deploy\w*|shift\w*)|moving (?:to|next)|convoy|rotation\w*|duty (?:schedule|roster|timings?|ends?)|patrol (?:timings?|schedule)|what time|typical (?:day|week)|daily routine|schedule)\b"),
    "equipment_weapons": rx(r"\b(?:weapon\w*|equipment|missile\w*|radar\w*|artillery|guns?|tanks?|ammunition|night.vision|thermal|drones?|systems? (?:are |is )?(?:deployed|inducted|used)|range of)\b"),
    "strength_personnel": rx(r"\b(?:how many (?:troops|men|soldiers|officers|personnel|tanks|guns)|strength of|troop (?:numbers|strength)|names of (?:officers|your co))\b"),
    "communications": rx(r"\b(?:frequenc\w+|radio net|call ?signs?|encryption|crypto key|comms? (?:plan|setup)|(?:vpn|intranet) (?:password|credentials|address|login))\b"),
    "credentials_financial": rx(r"\b(?:otp|password|passcode|pin|login|army id|service number|aadhaa?r|pan\b|bank (?:account|details)|card (?:number|details)|cvv|upi)\b"),
    "imagery": LEXICON_RE["media_request"],
    "documents": rx(r"\b(?:send (?:the |me )?(?:documents?|files?|map|roster|orders?|circular)|deployment map|duty roster|org(?:anisation)? chart)\b"),
}
# Weight = how damaging disclosure of that category is
TARGET_WEIGHT = {
    "location": 0.75, "unit_identity": 0.65, "movement_schedule": 0.8, "equipment_weapons": 0.85,
    "strength_personnel": 0.85, "communications": 0.9, "credentials_financial": 0.85, "imagery": 0.7,
    "documents": 0.9,
}
TECHNIQUE_WEIGHT = {
    "flattery": 0.35, "rapport_building": 0.35, "assumed_knowledge": 0.5, "bracketing": 0.6,
    "false_statement_probe": 0.45, "feigned_ignorance": 0.45, "quid_pro_quo": 0.5, "secrecy_request": 0.6,
    "channel_shift": 0.5, "authority_impersonation": 0.5, "urgency_pressure": 0.35, "sympathy_hook": 0.35,
    "coercive_leverage": 0.7, "veiled_threat": 0.75,
}
REQUEST_RE = rx(r"\?", r"\b(?:tell me|share|send|show|explain|walk me through|let me know|could you|can you|would you|please (?:share|send|tell|confirm|provide|verify))\b")
FAMILY_CONTEXT = rx(r"\b(?:mela|family welfare|wedding|birthday|anniversary|diwali|holi|eid|kids|school|mom|papa|didi|cafeteria|movie|match)\b")


def analyze(text, **_):
    t = normalize(text)
    techniques = {k: count_matches(p, t) for k, p in TECHNIQUES.items()}
    techniques = {k: v for k, v in techniques.items() if v}
    targets = {k: count_matches(p, t) for k, p in TARGETS.items()}
    targets = {k: v for k, v in targets.items() if v}
    is_request = bool(REQUEST_RE.search(t))

    tech_ev = noisy_or(TECHNIQUE_WEIGHT[k] for k in techniques)
    target_ev = noisy_or(TARGET_WEIGHT[k] for k in targets)
    if not is_request:
        target_ev *= 0.45  # mentioning a topic is far less risky than asking for it
    if FAMILY_CONTEXT.search(t) and not ({"equipment_weapons", "strength_personnel", "communications", "documents"} & set(targets)):
        target_ev *= 0.5

    # Elicitation = a technique *applied to* a target; either alone is weaker evidence
    elicitation = noisy_or([target_ev * (0.55 + 0.45 * tech_ev), tech_ev * 0.45])
    score = 100 * elicitation

    has_payload = bool(DROPPER_RE.search(t)) or bool(LEXICON_RE["malware"].search(t) and URL_RE.search(t))
    demand = bool(re.search(r"\b(?:send|share|pay|transfer|give|do what|cooperate)\b", t, re.I))
    coercive = {"coercive_leverage", "veiled_threat"} & set(techniques)
    if coercive and (targets or is_request or demand) and ("veiled_threat" in techniques or len(techniques) >= 2 or demand):
        intent = "coercion"
    elif has_payload:
        intent = "payload_delivery"
    elif "credentials_financial" in targets and is_request:
        intent = "credential_theft"
    elif targets and is_request and score >= 40:
        intent = "relationship_grooming" if {"flattery", "rapport_building", "sympathy_hook"} & set(techniques) else "information_elicitation"
    elif {"flattery", "rapport_building", "sympathy_hook", "secrecy_request", "channel_shift"} & set(techniques):
        intent = "relationship_grooming"
    else:
        intent = "benign_social"
    if intent in ("coercion", "payload_delivery", "credential_theft"):
        score = max(score, 75)

    signals = [f"technique:{k}" for k in techniques] + [f"target:{k}" for k in targets]
    return layer_result(
        1, "Intent & Elicitation", score, signals,
        {"primary_intent": intent, "techniques": techniques, "targeted_information": targets,
         "is_information_request": is_request},
        confidence=0.6 + 0.3 * min(1.0, len(signals) / 4))
