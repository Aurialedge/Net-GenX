"""
Synthetic labelled conversations for the learned conversation-risk model.

    generate_conversations(n=10000, seed=7) -> [{"messages": [{sender, text, ts}], "me": str,
                                                  "tier": 0|1|2, "category": 0..5, "scenario": str}]

tier: 0 LOW (benign), 1 MEDIUM (suspicious, self-handled with mitigation), 2 HIGH (CERT-Army).

Every conversation is generated turn by turn from a scenario script (who speaks, at which
grooming stage, with what kind of reply), filled from phrase pools, so the model learns
*conversation patterns* - progression, persistence after refusal, secrecy, late escalation -
rather than single templates. Benign scenarios deliberately include the hard cases a rule
system confuses: spouses ("miss you", "send a selfie", "when is your leave"), parents asking
when you are coming home, unit groups full of military words, security advisories, OTP-
delivery and bank SMS threads.

Phrases here are written for conversations and are separate from augment.py's message
templates; data/eval_conversations.json and test_chats/ are never used.
"""
import random

from augment import _perturb

CONTACT_NAMES = ["Riya", "Priya", "Ananya", "Simran", "Kavya", "Neha", "Tanya", "Pooja", "Sneha", "Meera", "Aisha",
                 "Isha", "Nisha", "Jessica", "Elena", "Sana", "Rohit Bhai", "Vikas", "Mr. Kapoor", "Defence Careers HR",
                 "+91 98XXXXXX21", "+91 70XXXXXX55", "+91 81XXXXXX40", "Unknown", "Sweety", "Pinky", "Dr. Arora",
                 "Help Desk", "Raj", "Sunny"]
ME_NAMES = ["Vikram", "Arjun", "Rahul", "Deepak", "Karan", "Aman", "Sandeep", "Rohan", "Nitin", "Ajay", "Suresh",
            "Hav Prakash", "Sub Kumar", "Capt Rao", "Maj Singh", "Nk Sharma", "Lt Col Das", "Gurpreet", "Ravi", "Vijay"]
FAMILY = ["Mummy", "Papa", "Didi", "Bhaiya", "Neha", "Priya", "Chachu", "Mama ji", "Beta", "माँ", "पापा"]
SPOUSE = ["Neha", "Priya", "Pooja", "Anjali", "Sonia", "Kavita", "Ritu", "Wife"]
PLACES = ["Pune", "Jaipur", "Lucknow", "Dehradun", "Chandigarh", "Bhopal", "Indore", "Patna"]

# ---------------------------------------------------------------------------------- benign pools
P = {
    "fam": ["Beta khana kha liya?", "Ghar pe sab theek hai, chinta mat karna", "Papa ki tabiyat ab theek hai",
            "Diwali pe ghar aa rahe ho na?", "Didi ki shaadi ki date fix ho gayi", "Thand bahut hai, garam kapde pehno",
            "Have you eaten properly?", "Grandma was asking about you", "Your cousin got a new job",
            "We sent a parcel with laddoos, collect it", "Call when you're free, nothing urgent", "Apna dhyan rakhna beta",
            "Holi pe aaoge?", "Kal mandir gaye the sab", "School fees bhar di hai", "Rain has started here",
            "बेटा कैसे हो?", "होली पर घर आओगे?", "अपना ध्यान रखना", "माँ ने लड्डू भेजे हैं", "पापा की तबीयत ठीक है"],
    "fam_reply": ["Haan mummy", "Theek hoon", "Ok", "Leave apply kar di hai", "Pakka aaunga", "Haan kha liya", "Will call tonight",
                  "Sure", "Thank you", "Ji", "ठीक हूँ", "हाँ आऊंगा", "Achha", "Ok papa"],
    "spouse": ["Miss you so much", "Dinner ho gaya?", "Leave kab mil rahi hai?", "When are you coming home?",
               "Aarav keeps asking for papa", "Send a selfie na, the kids want to see you", "Love you, take care",
               "Video call karo jab free ho", "Bills paid, don't worry", "Your mom called today",
               "Posting change kab hogi? We need to plan school admission", "Did you get the sweater I packed?",
               "Can't wait to see you jaan", "Good night, sleep well", "I made your favourite today",
               "Any news on the next posting? School forms are due soon", "Transfer order aaya kya?",
               "If you get a peace posting we can all move together", "Do we get family quarters at the new station?",
               "Kab tak wahan rahoge? Mummy pooch rahi thi", "Let me know once the posting order comes",
               "Which school is near the cantonment there?", "Packing kab start karein?"],
    "spouse_reply": ["Miss you too", "Next month hopefully", "Ok sending", "Haan ho gaya", "Will call at 9", "Love you",
                     "Order abhi nahi aaya", "Yes got it, thanks", "Good night"],
    "friend": ["Sunday ko match hai, aa raha hai?", "Movie chalein weekend pe?", "Bhai party kab de raha hai?",
               "Did you see the India match yesterday?", "Let's meet when you're on leave", "Trek plan karte hain next month",
               "Bro happy birthday!", "Kal ka plan cancel, baarish hai", "Send the group photo from the wedding",
               "Golu bhi aa raha hai", "Which phone should I buy?", "Gym chal raha hai?"],
    "friend_reply": ["Haan pakka", "Done", "Sure bro", "Kitne baje?", "Haha", "Sahi hai", "Ok", "Dekhte hain"],
    "unit": ["PT at 0630 hrs as usual", "Cyber awareness lecture at 1100 hrs in the auditorium", "Sports day on Saturday, register by Thursday",
             "Barakhana on Sunday, families invited", "Range firing shifted to Thursday", "Submit leave plans to the adjutant",
             "Duty roster is on the notice board", "Medical camp on Wednesday, carry documents", "Course joining instructions are out",
             "Weapon cleaning after lunch", "Conference at 1500 hrs in the CO's office", "Kit inspection tomorrow morning",
             "Reminder: never share OTP or service details on WhatsApp", "Blood donation camp at MH on Friday"],
    "unit_reply": ["Roger sir", "Noted sir", "Will do", "Copied", "Yes sir", "Done sir", "Ji sahab"],
    "service": ["Your order is out for delivery", "Your SBI account is credited with salary Rs 68,450", "OTP for login is 482913. Do not share it with anyone",
                "Rs 1,250 debited for UPI/swiggy", "Your recharge of Rs 299 is successful", "Electricity bill of Rs 1,830 paid successfully",
                "Your IRCTC ticket is confirmed, PNR 4521", "Your pension for November has been credited"],
}

# ---------------------------------------------------------------------------------- threat pools (by stage)
T = {
    "open": ["Hii 😊 I think we met in the {grp} group?", "Hey! Found you through a mutual friend", "Hello, sorry to message randomly",
             "Hi, saw your profile, you look nice", "Hello ji, aapki profile achhi lagi", "Good evening! Hope you don't mind me writing",
             "Hey stranger 🙂", "Hi, I'm {name} from {city}", "Namaste, kaise ho?", "Hello sir, greetings"],
    "rapport": ["You seem very genuine, not like others", "I really admire people who serve the nation", "You have such a kind smile",
                "Talking to you makes my day", "I feel like I've known you for years", "Wow, so brave! My papa wanted to join the army too",
                "Tum bahut achhe ho", "You're so different from other guys", "I love men in uniform 😍", "आप बहुत अच्छे लगते हो",
                "I work as a nurse, it's tiring but I love it", "I also like trekking and old songs"],
    "trust": ["Please don't tell anyone about our chats, it's our secret 🤫", "Let's move to Telegram, WhatsApp isn't safe",
              "Delete our chats after reading ok?", "You're the only one I trust", "My family is very strict, keep this between us",
              "I'm going through a hard time, only you understand me", "Kisi ko mat batana hamari baatein", "Let's talk on Signal instead"],
    "elicit": ["Where are you posted these days?", "Which unit are you in?", "When is your unit moving next?",
               "Is your camp near the border?", "What time do you guys go on patrol?", "How many soldiers are at your post?",
               "Which radars or missiles does your sector have?", "Send a pic of you in uniform please", "Share your live location na",
               "Do a video call from your camp, show me around", "Tumhari unit kab move kar rahi hai?", "Convoy kitne baje niklega?",
               "Post pe kitne jawan hai?", "आपकी यूनिट अभी कहाँ तैनात है?", "Which formation are you with now?",
               "What does your duty schedule look like this week?", "Send me a photo of your bunker"],
    "persist": ["Arre I won't tell anyone, just tell me", "Only for me na, please", "It's just general knowledge, no harm",
                "Why are you hiding things from me?", "If you trust me you'll tell me", "Bata na yaar, kisi ko nahi bataungi",
                "Only approximate figures, it will stay anonymous", "Others told me, why can't you?"],
    "exploit_honey": ["Video call karo abhi, camera on rakhna", "Send me your uniform pic with the unit board",
                      "Tell me the exact date your unit moves, I'll come there"],
    "exploit_black": ["I recorded our video call. Send Rs {amt} by tonight or it goes to your CO and family",
                      "I have your screenshots. Send the duty roster or everyone in your unit sees them",
                      "Tumhari video mere paas hai. {amt} bhejo warna sabko bhej dungi",
                      "Pay {amt} to {upi} or your wife gets the video"],
    "exploit_otp": ["You'll get an OTP now, please tell me the OTP", "Share the code you received to complete renewal",
                    "Send your card number and CVV for verification", "OTP bhej do jaldi, expire ho jayega",
                    "Tell me your net banking password, I'll fix it"],
    "exploit_mal": ["Install this private chat app instead: {apk} (allow unknown sources)", "Download {apk}, it's the new secure app",
                    "Open the attached posting list: Posting_List.pdf.exe", "Enable macros in the attached file to see the circular"],
    "exploit_money": ["Transfer {amt} to my UPI {upi} today and I'll add you", "Pay the {amt} gate pass fee on UPI first",
                      "Send {amt} as registration fee and the job is yours", "Scan this QR and pay {amt} to receive the refund"],
    "exploit_docs": ["Send the nominal roll with mobile numbers by evening", "Share the company's present locations on this number only",
                     "Forward the movement order PDF here, not through office", "Send the list of officers in your battalion"],
    "imp_open": ["Jai Hind, this is Col {last}, your new CO. Save this number", "This is Havildar {last} from CSD canteen, Station HQ",
                 "Sir, Adjutant here from a new number", "Hello sir, this is the bank's defence desk", "Sir, Records Office calling regarding your pension",
                 "Greetings from Defence Careers Consultancy"],
    "imp_setup": ["Your canteen card is due for renewal or it will be blocked", "Urgent task from HQ, keep this between us",
                  "Your pension is on hold due to KYC", "We have a high paying consultancy job for officers, Rs 3 lakh/month",
                  "Your account will be frozen today", "Don't route this through the office, it is confidential"],
    "invest": ["I help veterans grow savings with crypto trading", "Invest 50,000 and get 2 lakh in 15 days, guaranteed",
               "Many army officers have already joined our plan", "Our stock tips group gives 40% returns weekly"],
    "journo": ["I'm writing a feature on India's armed forces, thank you for your service", "I'd love to understand daily life in high-altitude areas",
               "For accuracy, which formation are you with and what systems has your sector received?",
               "Only approximate troop numbers at forward posts would help, it stays anonymous"],
    # MEDIUM-only content: suspicious but no harmful ask
    "spam": ["Congratulations! Your number won Rs 25 lakh in the lucky draw", "Call our manager on {phone} to claim your prize",
             "Work from home and earn Rs 3,000 daily, join our Telegram", "Offer valid today only, call fast",
             "Flat 70% off, visit our site now", "Your parcel is held, reply with your address",
             "You won a free smartphone! Claim here: bit.ly/{code}", "Exclusive cashback for you, tap tinyurl.com/{code}",
             "Lucky winner! Collect your gift at {code}-offers.shop"],
    "small": ["What music do you like?", "I love trekking, have you been to Himachal?", "Which movie did you watch recently?",
              "Do you like cooking?", "Have a good night!", "What do you do on weekends?", "Haha that's funny",
              "I'm reading a nice book these days", "We should chat more sometime"],
    "pressure": ["Return my money this week or there will be trouble", "You'll regret ignoring me", "Stop avoiding my calls",
                 "Settle the dues soon, I'm warning you", "Udhaar kab wapas karega yaar?", "Har baar yahi bolta hai, ab nahi chalega",
                 "Agle hafte tak nahi mila toh tere ghar aa jaunga", "Mera udhaar wapas kar warna dekh lena",
                 "I'll tell everyone in the colony you don't pay back", "Phone kyun nahi utha raha? Last warning",
                 "Paise do warna tumhare papa se baat karunga"],
}
REPLY = {
    "neutral": ["Hi", "Ok", "Who is this?", "Thanks", "Haha", "Hmm", "Fine", "Yes", "I'm in the army", "Nice", "Ok nice to meet you",
                "Sorry, I don't remember", "Busy right now", "Haan", "Achha"],
    "refuse": ["Can't share that, sorry", "I'm not allowed to discuss that", "That's classified", "Nahi bata sakta",
               "Ye sab share nahi kar sakta", "No, sorry", "Why do you want to know?", "Allowed nahi hai", "नहीं बता सकता"],
    "comply_soft": ["North side", "Somewhere cold", "Can't say much", "It's a field area", "Ok sending"],
    "scared": ["What? Delete it", "Please don't do this", "Who are you?", "I'll report you"],
}
FILL = {"grp": ["Fauji Parivar", "travel", "trekking", "alumni", "cricket fans"], "city": PLACES,
        "amt": ["Rs 50,000", "Rs 2 lakh", "50 hazaar", "Rs 25,000", "Rs 5,000"], "upi": ["help.pay@ybl", "kapoor.invest@okaxis", "riya99@paytm"],
        "apk": ["LoveChat_Pro.apk", "SecureMsg.apk", "FriendTrack_v2.apk", "ArmyWelfare.apk"],
        "phone": ["9876500011", "7011223344", "9812345670"], "last": ["Bhardwaj", "Yadav", "Sharma", "Rathore", "Mehta"],
        "name": ["Riya", "Kavya", "Tanya", "Elena"], "code": ["x7Kq2", "win-iph", "gft88", "promo24", "claimnow"]}


def _f(rng, s):
    for k, v in FILL.items():
        while "{" + k + "}" in s:
            s = s.replace("{" + k + "}", rng.choice(v), 1)
    return s


def _pick(rng, pool):
    return _f(rng, rng.choice(pool))


# ---------------------------------------------------------------------------------- scenarios
# A script is a list of steps: ("c", pool) contact speaks, ("u", reply-kind) reporter replies.
def _honeytrap(rng, persist):
    s = [("c", "open"), ("u", "neutral"), ("c", "rapport")]
    s += [("c", "rapport")] * rng.randint(0, 2) + [("u", "neutral")]
    if rng.random() < 0.7:
        s += [("c", "trust")]
    s += [("c", "elicit")]
    if persist:
        s += [("u", "refuse"), ("c", "persist"), ("c", "elicit")]
    else:
        s += [("u", rng.choice(["neutral", "comply_soft"])), ("c", "elicit")]
    if rng.random() < 0.5:
        s += [("c", "exploit_honey")]
    return s


SCENARIOS = {
    # ---------------- LOW
    "family": (0, 0, lambda r: [(("c", "fam") if i % 2 == 0 else ("u", "fam_reply")) for i in range(r.randint(3, 10))]),
    "spouse": (0, 0, lambda r: [(("c", "spouse") if i % 2 == 0 else ("u", "spouse_reply")) for i in range(r.randint(3, 10))]),
    "friends": (0, 0, lambda r: [(("c", "friend") if i % 2 == 0 else ("u", "friend_reply")) for i in range(r.randint(3, 9))]),
    "unit_group": (0, 0, lambda r: [(("c", "unit") if i % 2 == 0 else ("u", "unit_reply")) for i in range(r.randint(3, 10))]),
    "service_sms": (0, 0, lambda r: [("c", "service")] * r.randint(2, 6)),
    # ---------------- MEDIUM
    "friendly_stranger": (1, 1, lambda r: [("c", "open"), ("u", "neutral")] + [("c", "small"), ("u", "neutral")] * r.randint(1, 3)
                          + [("c", "rapport")] * r.randint(0, 1)),
    "spam_thread": (1, 2, lambda r: [("c", "spam")] * r.randint(2, 4) + [("u", "neutral")] * r.randint(0, 1)),
    "one_question_dropped": (1, 5, lambda r: [("c", "open"), ("u", "neutral"), ("c", "elicit"), ("u", "refuse")]
                             + [("c", "small"), ("u", "neutral")] * r.randint(1, 3)),
    "vague_pressure": (1, 4, lambda r: [("c", "pressure"), ("u", "neutral")] * r.randint(1, 3)),
    "group_with_spam": (1, 2, lambda r: [("c", "unit"), ("u", "unit_reply")] * r.randint(1, 3) + [("s", "spam")]
                        + [("c", "unit")] * r.randint(0, 2)),
    # ---------------- HIGH
    "honeytrap": (2, 1, lambda r: _honeytrap(r, persist=r.random() < 0.5)),
    "slow_elicitation": (2, 5, lambda r: [("c", "open"), ("u", "neutral"), ("c", "small"), ("u", "neutral"), ("c", "elicit"),
                                          ("u", "refuse")] + [("c", "elicit")] * r.randint(2, 4)),
    "sextortion": (2, 4, lambda r: [("c", "open"), ("u", "neutral"), ("c", "rapport"), ("c", "exploit_honey"), ("u", "neutral"),
                                    ("c", "exploit_black"), ("u", "scared"), ("c", "exploit_black")]),
    "impersonation_otp": (2, 2, lambda r: [("c", "imp_open"), ("u", "neutral"), ("c", "imp_setup"), ("u", "neutral"),
                                           ("c", "exploit_otp")] + [("c", "exploit_otp")] * r.randint(0, 1)),
    "impersonation_docs": (2, 5, lambda r: [("c", "imp_open"), ("u", "neutral"), ("c", "imp_setup"), ("c", "exploit_docs")]
                           + [("c", "exploit_docs")] * r.randint(0, 1)),
    "fake_recruiter": (2, 5, lambda r: [("c", "imp_open"), ("c", "imp_setup"), ("u", "neutral"), ("c", "journo"), ("c", "elicit"),
                                        ("u", "refuse"), ("c", "persist")]),
    "malware_drop": (2, 3, lambda r: [("c", "open"), ("u", "neutral"), ("c", "rapport"), ("c", "exploit_mal")]
                     + [("c", "exploit_mal")] * r.randint(0, 1)),
    "investment_scam": (2, 2, lambda r: [("c", "invest"), ("u", "neutral"), ("c", "invest"), ("c", "exploit_money")]),
    "journalist": (2, 5, lambda r: [("c", "journo"), ("u", "neutral"), ("c", "journo"), ("c", "elicit"), ("u", "refuse"), ("c", "persist")]),
    "late_escalation": (2, 1, lambda r: [("c", "small"), ("u", "neutral")] * r.randint(3, 6) + [("c", "rapport"), ("c", "elicit"), ("c", "elicit")]),
}
# share of the corpus per scenario (LOW 40% / MEDIUM 20% / HIGH 40%)
WEIGHTS = {"family": 10, "spouse": 9, "friends": 8, "unit_group": 8, "service_sms": 5,
           "friendly_stranger": 6, "spam_thread": 4, "one_question_dropped": 5, "vague_pressure": 4, "group_with_spam": 3,
           "honeytrap": 8, "slow_elicitation": 5, "sextortion": 4, "impersonation_otp": 4, "impersonation_docs": 3,
           "fake_recruiter": 3, "malware_drop": 3, "investment_scam": 3, "journalist": 3, "late_escalation": 4}

# a minority of threats wrap their steps in benign small talk, so position/length is not a giveaway
_WRAP_SMALL = ("c", "small")


def _render(rng, scenario):
    tier, cat, script_fn = SCENARIOS[scenario]
    steps = script_fn(rng)
    if tier == 2 and rng.random() < 0.3:
        k = rng.randint(1, max(1, len(steps) - 1))
        steps = steps[:k] + [_WRAP_SMALL, ("u", "neutral")] + steps[k:]
    me = rng.choice(ME_NAMES)
    pool_owner = {"family": FAMILY, "spouse": SPOUSE}.get(scenario, CONTACT_NAMES)
    contact = rng.choice([n for n in pool_owner if n != me])
    ts = 1.79e9 + rng.uniform(0, 3e7)
    msgs = []
    for who, kind in steps:
        # replies mostly within minutes, sometimes hours/days apart - same for every scenario
        ts += rng.choice([rng.uniform(5, 120), rng.uniform(5, 120), rng.uniform(60, 1800), rng.uniform(1800, 86400 * 2)])
        if who in ("c", "s"):
            pool = T.get(kind) or P[kind]
            text = _pick(rng, pool)
            if rng.random() < 0.3:  # real people pack two thoughts into one message
                text += rng.choice([" ", ". ", "! "]) + _pick(rng, pool)
            sender = contact if who == "c" else rng.choice(["+91 99XXXXXX01", "+91 87XXXXXX33", "Unknown"])
        else:
            text = _pick(rng, REPLY.get(kind) or P[kind])
            sender = me
        msgs.append({"sender": sender, "text": _perturb(text, rng), "ts": ts})
    if scenario in ("unit_group", "group_with_spam"):  # group chats: several senders
        for m in msgs:
            if m["sender"] == contact and rng.random() < 0.5:
                m["sender"] = rng.choice(["Sub Maj Rawat", "Adjt", "Hav Singh", "Nk Verma"])
    return {"messages": msgs, "me": me, "tier": tier, "category": cat, "scenario": scenario}


def generate_conversations(n=10000, seed=7):
    rng = random.Random(seed)
    names, w = zip(*WEIGHTS.items())
    return [_render(rng, rng.choices(names, weights=w)[0]) for _ in range(n)]


if __name__ == "__main__":
    import collections
    import sys
    sys.stdout.reconfigure(encoding="utf-8")
    convs = generate_conversations()
    print(len(convs), "conversations;", sum(len(c["messages"]) for c in convs), "messages")
    print("tiers", dict(collections.Counter(c["tier"] for c in convs)))
    print("scenarios", dict(collections.Counter(c["scenario"] for c in convs)))
    for c in convs[:3]:
        print(f"--- {c['scenario']} tier {c['tier']} (me={c['me']})")
        for m in c["messages"]:
            print(f"   {m['sender']}: {m['text']}")
