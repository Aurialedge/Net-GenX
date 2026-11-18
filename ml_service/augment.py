"""
Compositional data augmentation for the NetGenX risk classifier.

The cleaned dataset has 1,000 rows but only ~211 unique texts (15 benign, 6
phishing, 4 dropper templates), which is far too narrow: the original model
learned template wording, not intent. Here we compose new samples from
slot-based fragments per class, deliberately covering:

  * casual / Hinglish / terse human phrasing,
  * polished, warm "humanised GenAI bot" phrasing for every threat class, and
  * equally polished *benign* phrasing so the model learns intent, not tone.

Generation is deterministic (seeded). None of these fragments are taken from
data/challenge_set.csv, which is kept as an untouched held-out test set.
"""
import random

NAMES = ["Priya", "Ananya", "Riya", "Simran", "Neha", "Kavya", "Aisha", "Meera", "Rahul", "Arjun", "Sneha", "Pooja"]
CITIES = ["Pune", "Jaipur", "Chandigarh", "Lucknow", "Bengaluru", "Kolkata", "Dehradun", "Mumbai", "Hyderabad"]
PLACES = ["Udhampur", "Leh", "Pathankot", "Jodhpur", "Tezpur", "Ambala", "Bathinda", "Siliguri", "Kupwara", "Barmer"]
UNITS = ["your battalion", "your regiment", "your unit", "your squadron", "your brigade", "your formation"]
BAD_TLDS = ["xyz", "top", "info", "online", "cc", "click", "site", "live", "icu", "buzz"]
LURE_BRANDS = ["sparsh", "echs", "pcda", "csd", "awho", "agif", "dsop", "army-welfare", "defence-pension", "cghs"]


def _url(rng, brand=None):
    brand = brand or rng.choice(LURE_BRANDS)
    path = rng.choice(["verify", "login", "update", "kyc", "claim", "secure", "renew", "auth"])
    sep = rng.choice(["-", ""])
    mid = rng.choice(["portal", "gov", "update", "secure", "online", "india", "verify"])
    return f"{rng.choice(['http://', 'https://', 'www.', ''])}{brand}{sep}{mid}.{rng.choice(BAD_TLDS)}/{path}"


# --------------------------------------------------------------------------
# Class 0 - benign (routine, family, admin, and polished-but-harmless)
# --------------------------------------------------------------------------
BENIGN = [
    "Sir, {evt} has been rescheduled to {time} on {day}.",
    "Reminder: {evt} on {day} at {time}. Attendance is compulsory for all ranks.",
    "Please submit the {doc} to the {office} by {day}.",
    "The {doc} for this month has been uploaded on the unit intranet portal.",
    "Can you share the {doc} when you get a moment? Need it for the {evt}.",
    "Noted sir, will complete the {doc} and put it up by {day}.",
    "{fam} called, asked you to ring back after dinner.",
    "Happy {occ}! Wishing you and the family all the best.",
    "Thanks for coordinating the {evt}, everything went smoothly.",
    "Bhai {day} ko {evt} hai, time pe aa jana.",
    "Kal {evt} ke baad chai pe milte hain.",
    "Good morning everyone, {evt} starts at {time}. Please be on time.",
    "Dear all, I hope you are doing well. Please find attached the {doc} for your reference. Kindly review it before the {evt} on {day}.",
    "Hello team! Just a gentle reminder that the {evt} is scheduled for {day} at {time}. Looking forward to seeing everyone there!",
    "Thank you so much for your support during the {evt}. It was truly a wonderful experience for all the families.",
    "I hope this message finds you well. The {office} has asked all sections to update the {doc} by {day}. Please reach out if you need any help.",
    "Kindly note that the {office} will remain closed on {day} due to {occ}.",
    "Please verify the {doc} entries against the master register before submitting to the {office}.",
    "Official notice: the {evt} will be conducted as per the schedule published on the {office} notice board.",
    "Visit https://{gov} for the official circular regarding the {evt}.",
    "Pension related queries should be raised only through the official portal https://sparsh.defencepension.gov.in or the record office.",
    "Do not share your OTP or password with anyone. The {office} will never ask for it on phone or WhatsApp.",
    "Ok sir.", "Roger, copied.", "Will do.", "On my way, reaching in 10 minutes.",
    "How was your day? Did you eat properly?", "Call me when you are free, nothing urgent.",
    "Kids have exams next week, will visit after that.", "Can we meet at the cafeteria after work?",
    "The match on Sunday was great fun, we should play again.",
    "Which movie are we watching at the garrison cinema this weekend?",
    "The duty officer for {day} is Capt Mehra, contact him for any issues.",
    "All personnel are reminded to complete the cyber awareness training on the official intranet by {day}.",
    "Training schedule for next week has been put up in the {office}.",
    "Bhai {hin}", "Yaar {hin}", "{hin} 😂", "Arre {hin}", "{hin} kal baat karte hain.",
    "{greet}", "{greet} {small}", "{greet}, {small}", "{small}",
]
B_SLOTS = {
    "evt": ["the CO's conference", "sainik sammelan", "the barakhana", "weapon training", "the sports meet",
            "the medical camp", "the family welfare meet", "the quarterly audit", "the passing out parade",
            "the unit raising day", "PT parade", "the course briefing", "the guest lecture"],
    "time": ["0900 hrs", "1030 hrs", "1400 hrs", "1600 hrs", "1800 hrs", "7 pm", "10 am"],
    "day": ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "tomorrow", "next week"],
    "doc": ["leave roster", "attendance sheet", "stores ledger", "training report", "vehicle log book",
            "mess accounts", "minutes of meeting", "medical documents", "course nomination list", "duty chart"],
    "office": ["adjutant office", "orderly room", "QM office", "station HQ", "record office", "admin section"],
    "fam": ["Mom", "Papa", "Your wife", "Didi", "Uncle ji"],
    "occ": ["Diwali", "Holi", "Eid", "Republic Day", "Independence Day", "birthday", "anniversary", "Lohri"],
    "greet": ["Hi", "Hello", "Hey", "Hi sir", "Good morning", "Good evening", "Namaste", "Jai Hind sir", "Hello ji",
              "Hey buddy", "Hi there", "Good afternoon sir"],
    "small": ["how are you?", "how are you doing?", "hope you are well.", "what's up?", "how was your day?",
              "long time no see!", "how is everyone at home?", "are you free to talk?", "what are you doing today?",
              "how's the weather there?", "did you have lunch?", "all good?", "see you soon."],
    "hin": ["match dekha kal? kya khela India ne!", "ghar pe sab theek hai?", "khana kha liya?", "kal chhutti hai kya?",
            "movie chalein weekend pe?", "mummy ka phone aaya tha, baat kar lena.", "train ka ticket confirm hua?",
            "shaadi mein aa rahe ho na?", "PT ke baad chai peete hain.", "naya phone kaisa hai?", "Diwali pe ghar aa raha hai?",
            "cricket khelne chalega shaam ko?"],
    "gov": ["indianarmy.nic.in", "mod.gov.in", "desw.gov.in", "echs.gov.in", "pcdapension.nic.in"],
}

# --------------------------------------------------------------------------
# Class 1 - honeytrap / romance-led espionage
# --------------------------------------------------------------------------
HONEY = [
    "{opener} {flatter} {ask}",
    "{opener} {lonely} {ask}",
    "{flatter} {ask}",
    "{lonely} {media}",
    "{opener} {flatter} {media}",
    "Hi {sweet}, {lonely} {media}",
    "{genai_open} {genai_rapport} {genai_ask}",
    "{genai_rapport} {genai_ask}",
    "{genai_open} {genai_ask}",
]
H_SLOTS = {
    "opener": ["Hey!", "Hii", "Hello dear,", "Hi there,", "Heyy soldier,", "Namaste ji,", "Hi, I'm {name} from {city}.",
               "Hello, saw your profile.", "Hey, remember me from the {city} group?"],
    "flatter": ["You look so handsome in uniform.", "I really admire men who serve the nation.",
                "You seem so brave and disciplined.", "Your profile picture is so dashing.",
                "I have a big crush on army officers.", "You are my hero, seriously.",
                "Soldiers like you are so attractive."],
    "lonely": ["I feel very lonely these days.", "Talking to you makes my day.", "I can't stop thinking about you.",
               "I miss you so much babe.", "Nobody understands me like you do.", "I want to be close to you."],
    "ask": ["Which regiment are you in?", "Where are you posted right now?", "Which unit are you with?",
            "Where is {unit} stationed these days?", "Are you posted near {place}?", "When is {unit} moving next?",
            "Tell me what you do all day at the base.", "What time does your duty end at the post?",
            "Is your camp near the border?"],
    "media": ["Send me a selfie in uniform please.", "Can we video call from your room tonight?",
              "Show me a photo of your post.", "Send a pic of where you live at the base.",
              "Share your live location so I know you're safe.", "Turn on your camera, I want to see your bunker."],
    "sweet": ["sweetheart", "baby", "jaan", "darling", "handsome"],
    "genai_open": ["Hello! I hope you're having a wonderful day.", "Hi there! I came across your profile and felt compelled to reach out.",
                   "Good evening! I hope this message finds you in good spirits.",
                   "Hey! I just wanted to say how much I enjoy our conversations."],
    "genai_rapport": ["Your dedication to the nation is genuinely inspiring, and I feel a real connection with you.",
                      "I truly value the trust we've built, it means so much to me.",
                      "I can only imagine how challenging life in the forces must be, and I deeply respect it.",
                      "It's rare to find someone as thoughtful and grounded as you."],
    "genai_ask": ["I'd love to know more about where you're stationed and what your days look like!",
                  "Could you share a picture of your surroundings? I'd love to feel closer to your world.",
                  "Out of curiosity, which unit are you part of and where is it based?",
                  "Would you be open to a quick video call from your quarters tonight?",
                  "What does your duty schedule look like this week? I want to plan our calls around it."],
}

# --------------------------------------------------------------------------
# Class 2 - phishing / credential harvesting
# --------------------------------------------------------------------------
PHISH = [
    "{brand_u} Alert: {problem} {action} {url}",
    "Dear {who}, {problem} {action} {url} {urgency}",
    "{problem} {cred_ask} {urgency}",
    "Congratulations {who}! {prize} {cred_ask}",
    "{brand_u}: {problem} Click {url} to {verb}.",
    "{genai_phish_open} {problem} {genai_phish_ask} {url}",
]
P_SLOTS = {
    "who": ["pensioner", "veteran", "soldier", "sir", "customer", "beneficiary", "account holder"],
    "brand_u": ["SPARSH", "ECHS", "PCDA", "CSD", "AWHO", "AGIF", "Army Welfare Fund", "DSOP"],
    "problem": ["Your pension has been put on hold.", "Your account will be deactivated.", "Your KYC has expired.",
                "Your salary credit failed due to PAN mismatch.", "Your ECHS card is blocked.",
                "Your DA arrears are pending verification.", "Your canteen card is suspended."],
    "action": ["Update your details at", "Re-verify your Aadhaar at", "Login with your service number at",
               "Complete verification at", "Submit your bank details at"],
    "cred_ask": ["Share your OTP to continue.", "Reply with your bank account number and OTP.",
                 "Send your army ID and password for verification.", "Provide your Aadhaar and PAN to receive it.",
                 "Enter your card details and CVV to proceed."],
    "prize": ["You have won Rs 25,000 in the welfare lucky draw.", "You are eligible for a cash reward of Rs 50,000.",
              "Your refund of Rs 12,400 is approved."],
    "urgency": ["Do it within 24 hours.", "Act immediately to avoid suspension.", "This is the final notice.",
                "Failure will lead to account termination."],
    "verb": ["verify", "reactivate", "claim", "restore access", "avoid penalty"],
    "genai_phish_open": ["Dear Valued Member, we hope you are doing well.", "Greetings from the welfare support team!",
                         "We sincerely appreciate your service to the nation."],
    "genai_phish_ask": ["To ensure uninterrupted benefits, kindly confirm your credentials through our secure portal:",
                        "Please take a moment to verify your login details at your earliest convenience:"],
}

# --------------------------------------------------------------------------
# Class 3 - malicious dropper / spyware
# --------------------------------------------------------------------------
MAL = [
    "{auth} {lure} Install {file} from {url}",
    "{lure} Open the attached {file} to view.",
    "Download {file} and {exec}.",
    "{auth} The old app is outdated, sideload {file} and allow unknown sources.",
    "Please {exec} the attached {file} to fix the {fix}.",
    "{genai_mal} {file}",
]
M_SLOTS = {
    "auth": ["Official:", "From Signals branch:", "HQ order:", "Urgent from MS branch:", "IT cell notice:"],
    "lure": ["Revised posting list released.", "New DA arrears calculator available.", "Secure chat app mandatory now.",
             "Updated leave rules circular.", "Pay slip viewer updated."],
    "file": ["PostingList.pdf.exe", "Arrears_Calc.apk", "secure_chat_v3.apk", "LeaveRules.docm", "PaySlip.xlsm",
             "hamraaz_update.apk", "vpn_fix.ps1", "Circular_2026.scr", "orders.bat", "kavach_patch.msi"],
    "exec": ["enable macros", "run it as administrator", "install it on your phone", "enable editing and content",
             "run this script"],
    "fix": ["intranet VPN error", "email login issue", "app crash", "certificate warning"],
    "genai_mal": ["Hi! To make your experience smoother, our team has prepared a lightweight helper app. Simply install it from the attached file:",
                  "We've streamlined the circular viewer for your convenience. Please download and enable content to access:"],
}

# --------------------------------------------------------------------------
# Class 4 - blackmail / coercion / sextortion
# --------------------------------------------------------------------------
BLACK = [
    "{have} {demand} {threat}",
    "{threat} {demand}",
    "{have} {threat}",
    "{genai_black}",
    "{veiled}",
]
K_SLOTS = {
    "have": ["We have your private video.", "Your intimate chats are archived with us.", "I recorded our video call.",
             "We have screenshots of everything you sent.", "Your browsing history has been captured."],
    "demand": ["Send the deployment map.", "Share the duty roster.", "Pay Rs 1 lakh by tonight.",
               "Send us the documents we asked for.", "Cooperate and answer our questions about {unit}."],
    "threat": ["Otherwise it goes to your wife and your CO.", "Or we will leak everything on social media.",
               "Or you will face court martial.", "Or everyone in your regiment will see it.",
               "If you refuse, the consequences will ruin your career."],
    "veiled": ["It would be a shame if {who_sees} found out about us.", "I kept all your pictures. {pay_ask} or {who_sees} gets them.",
               "You don't want {who_sees} reading these messages, do you? {pay_ask}.",
               "{pay_ask}, unless you want this to go public.", "Think about your career. {pay_ask} and nobody needs to know."],
    "who_sees": ["your family", "your CO", "your unit", "the whole cantonment", "your wife", "your seniors"],
    "pay_ask": ["Send 30k on this UPI", "Share the posting order", "Send me the unit list", "Transfer the money by Friday",
                "Give me the duty chart"],
    "genai_black": ["I'd really prefer to keep this between us. I'm sure you wouldn't want those photos reaching your commanding officer, so let's work together on the small favour I mentioned.",
                    "Let's be reasonable here. All I need is the roster, and those recordings will never see the light of day. Otherwise, I can't promise what happens next."],
}

# --------------------------------------------------------------------------
# Class 5 - OPSEC reconnaissance / elicitation
# --------------------------------------------------------------------------
OPSEC = [
    "{pretext} {q}",
    "{q} {casual}",
    "{pretext} {q} {casual}",
    "{genai_pre} {q}",
    "{genai_pre} {genai_q}",
]
O_SLOTS = {
    "pretext": ["I'm a defence journalist.", "I'm writing a research paper on Indian defence.",
                "I work for a defence consultancy.", "I'm just a military enthusiast.", "My uncle was in the army too.",
                "I'm a student doing a project on border security."],
    "q": ["Which radar systems are deployed near {place}?", "How many troops are at the forward posts?",
          "What missiles does your formation have?", "When is the convoy moving to {place}?",
          "Which frequencies do you use on the radio net?", "Where exactly is the ammunition depot?",
          "What is the strength of {unit} now?", "Is the strike corps mobilising?",
          "What weapon systems were inducted in your unit recently?", "What are the patrol timings at the LoC post?",
          "Where are the air defence guns positioned?"],
    "casual": ["Just curious.", "No big deal, just asking.", "I won't tell anyone.", "It's only for general knowledge."],
    "genai_pre": ["That's a fascinating perspective, thank you for sharing!", "I really appreciate your insights, they're so valuable.",
                  "As someone passionate about strategic affairs, I'd love to learn from your first-hand experience."],
    "genai_q": ["Could you walk me through how your unit's equipment and positions are organised?",
                "I'd be grateful if you could share which systems are currently deployed in your sector.",
                "Would you mind explaining how troop rotations to the forward areas are scheduled?"],
}

CLASS_SPECS = [
    (0, BENIGN, B_SLOTS),
    (1, HONEY, H_SLOTS),
    (2, PHISH, P_SLOTS),
    (3, MAL, M_SLOTS),
    (4, BLACK, K_SLOTS),
    (5, OPSEC, O_SLOTS),
]
COMMON = {"name": NAMES, "city": CITIES, "place": PLACES, "unit": UNITS}

# ==========================================================================
# Graded severity corpus (v4).
#
# Every template above is a *severe*, fully-formed attack, so the old model
# learned "threat => ~90 risk" and nothing in between. The risk score must
# instead separate:
#   tier 0  LOW     benign, incl. security advisories that *mention* OTP/phishing
#   tier 1  MEDIUM  suspicious / early-stage: no concrete ask for credentials,
#                   payloads, operational detail or leverage yet -> mitigation
#   tier 2  HIGH    concrete harmful ask or hard evidence -> CERT-Army handover
# ==========================================================================

# ---- extra LOW: benign text that shares vocabulary with threats ----------
BENIGN_HARD = [
    "Cyber cell advisory: {scam_kind} are doing the rounds. {safe_advice}",
    "Security reminder from the {office}: {safe_advice}",
    "{safe_advice} Report suspicious messages to the unit cyber cell.",
    "Please change your {sys} password before {day}. Use the intranet self-service page or visit the signals office.",
    "The {sys} will be down for maintenance on {day} from {time}. Please save your work.",
    "Your {sys} account has been created. Collect the initial password from the signals office in person.",
    "Well done on {achieve}! {cheer}",
    "Your order of {item} has been dispatched and will be delivered by {day}.",
    "Your {item} booking is confirmed for {day}. Show this message at the counter.",
    "Subject: {subj_b}\nDear all, {body_b} Regards, {sig}",
    "Subject: {subj_b}\n{body_b}",
    "The {exercise} briefing is at {time} in the conference hall. All {role} to attend with documents.",
    "Movement order for the {exercise} has been issued by the {office}. Collect your copy before {day}.",
    "Pension slip for this month is available on the official SPARSH portal https://sparsh.defencepension.gov.in under 'My documents'.",
    "{fam} is asking if you will come home for {occ}. Book tickets early please.",
    "{hin2}",
    # warm / social messages from people the reader knows: friendliness alone is not a threat
    "{wish}", "{wish} {wish_tail}", "{greet2}! {wish}",
    "Can you send me the {pics} from {event2}? {fam_tail}",
    "Sharing the {pics} from {event2}, {fam_tail}",
    "{fam} sent the {pics} from {event2}, they look lovely.",
    "Miss you {kin}, see you on {occ}.",
    "Thank you {kin}, the gift was lovely!",
    "{team_win}", "{team_win} {cheer}",
]
BH_SLOTS_SOCIAL = {
    "wish": ["Happy birthday!", "Happy anniversary to you both!", "Happy Diwali to you and the family!",
             "Many happy returns of the day!", "Congratulations on the new baby!", "Best wishes for the exam!",
             "Get well soon, take rest.", "Eid Mubarak!", "Happy new year!"],
    "wish_tail": ["Have a great year ahead.", "Stay blessed.", "Enjoy your day.", "Party soon!", "Lots of love from all of us."],
    "greet2": ["Hey", "Hi bhaiya", "Hello aunty", "Hi didi", "Dear friend"],
    "pics": ["photos", "pics", "videos", "group photo", "pictures"],
    "event2": ["the wedding", "the school function", "Diwali night", "the family picnic", "the birthday party",
               "the trek", "the reunion"],
    "fam_tail": ["Mom wants to print them.", "the kids want to see them.", "no hurry.", "thanks!"],
    "kin": ["didi", "bhaiya", "mama", "beta", "yaar", "chachu"],
    "team_win": ["Our team won the volleyball final today!", "We won the inter-company cricket match yesterday.",
                 "Our battalion won the football tournament!", "Our company won the drill competition this year.",
                 "We won the quiz competition at the station.", "Our school team won the debate trophy."],
}
BH_SLOTS = {
    "scam_kind": ["fake pension portals", "fraud calls posing as CSD staff", "fake job offers for veterans",
                  "lookalike ECHS websites", "fake WhatsApp messages from 'senior officers'"],
    "safe_advice": ["Never share your OTP, PIN or password with anyone, even if the caller claims to be an officer.",
                    "Only use .gov.in and .nic.in portals for pension and welfare services.",
                    "Do not install apps from links received on WhatsApp; use the official store only.",
                    "Verify any request for documents by calling the office on its official number."],
    "sys": ["unit LAN", "intranet email", "office desktop", "ERP", "e-office"],
    "achieve": ["clearing the course", "the medal at the sports meet", "your selection for the staff course",
                "topping the firing test", "the excellent inspection report"],
    "cheer": ["The section is proud of you.", "Treat is due!", "Keep it up.", "Many congratulations from all of us."],
    "item": ["headphones", "school books", "the cooler", "train ticket", "the cricket kit", "groceries"],
    "subj_b": ["Revised mess timings", "Minutes of the welfare meeting", "Leave plan for next quarter",
               "Sports meet budget draft", "Training calendar", "Library books return"],
    "body_b": ["please see the attached sheet and send corrections to the orderly room by Friday.",
               "the revised schedule is attached for your information. No action is required.",
               "kindly go through the draft and share your inputs in the next meeting.",
               "the document is also available on the unit intranet."],
    "sig": ["Adjt", "Capt Rao", "Sub Maj", "QM", "Welfare JCO"],
    "exercise": ["annual exercise", "firing camp", "inter-unit competition", "road move", "training camp"],
    "role": ["drivers", "detachment commanders", "JCOs", "officers", "NCOs"],
    "hin2": ["Bhai sham ko mess mein milte hain, khana saath khayenge.", "Didi ki shaadi ki date fix ho gayi, chhutti apply kar dena.",
             "Papa ki report normal aayi hai, chinta mat karna.", "Kal ki parade cancel ho gayi, aaram karo.",
             "Ticket book ho gaya, Friday ko nikal raha hoon."],
}

# ---- MEDIUM tier, one block per threat category -------------------------
HONEY_MED = [
    "{m_open} {m_rapport}",
    "{m_open} {m_rapport} {m_soft}",
    "{m_rapport} {m_soft}",
    "{m_open} {m_soft}",
]
HM_SLOTS = {
    "m_open": ["Hey there!", "Hi, hope you don't mind me messaging.", "Hello stranger,", "Hii, I'm {name} from {city}.",
               "Good evening!", "Hi, we have some mutual friends."],
    "m_rapport": ["You seem like a genuinely nice person.", "Your photos look so cheerful.", "You have a great vibe.",
                  "I like your posts, they are so inspiring.", "You look very smart in your profile picture."],
    "m_soft": ["Can we be friends?", "Would you like to chat sometime?", "Are you on Instagram too?",
               "Do you work in the forces?", "Shall we talk more on WhatsApp?", "What do you do for a living?"],
}
PHISH_MED = [
    "{lot_open} {lot_body}",
    "Dear customer, {gen_problem} {gen_action}",
    "{deal} {shop_url}",
    "{gen_problem} Call {phone} for help.",
    "Your parcel could not be delivered due to an incomplete address. Reply with your address to reschedule.",
    "{job}",
    "{invest}", "{invest} {invest_tail}",
]
PM_SLOTS = {
    "invest": ["Invest {inv_amt} and get {inv_ret} in {inv_time}.", "Double your money in {inv_time} with our plan.",
               "Get rich quick with our {inv_kind}, guaranteed {inv_pct} returns.", "Earn {inv_pct} profit every week from our {inv_kind}.",
               "Put {inv_amt} in our scheme and receive {inv_ret} by {inv_time}."],
    "invest_tail": ["Limited slots!", "Join now.", "No risk at all.", "WhatsApp us to start.", "Hurry, offer closes today."],
    "inv_amt": ["Rs 5,000", "10000", "Rs 20,000", "50k", "1 lakh"],
    "inv_ret": ["Rs 25,000", "50000", "double the amount", "Rs 1 lakh", "5 lakh"],
    "inv_time": ["a week", "10 days", "one month", "30 days", "2 weeks"],
    "inv_kind": ["crypto plan", "stock tips group", "forex scheme", "trading app", "gold scheme"],
    "inv_pct": ["30%", "40%", "100%", "200%", "50%"],
    "lot_open": ["Congratulations!", "Lucky winner alert!", "Dear user,", "Great news!"],
    "lot_body": ["Your number has been selected for a prize of Rs 10 lakh. Call {phone} to know more.",
                 "You have won a free holiday package. Reply YES to claim.",
                 "Your SIM has won the monthly bumper draw, contact {phone}.",
                 "You are selected for a cashback of Rs 5,000 on your next recharge.",
                 "You have won a lottery of Rs 50 lakh!", "You won 1 crore in the lucky draw.",
                 "Your mobile number won a car in our anniversary contest.", "You are the winner of an iPhone, claim now.",
                 "Click here to claim your free gift.", "Tap the link to collect your cashback.",
                 "Click now to get your reward points.", "Claim your prize before it expires, click here."],
    "gen_problem": ["your account statement is ready.", "your loan pre-approval is waiting.",
                    "your credit card reward points will lapse soon.", "your wallet balance is about to expire.",
                    "your insurance policy needs renewal."],
    "gen_action": ["Visit the branch to update details.", "Reply to this message for more information.",
                   "Contact customer care at your convenience.", "Check the app for details."],
    "deal": ["Mega sale! Up to 80% off on shoes and watches.", "Flat 60% off on laptops this weekend only.",
             "Buy 1 get 1 free on all smartwatches.", "Festival offer: cheapest flights of the year."],
    "shop_url": ["www.bigbazaar-offers.shop", "dealzone-online.store", "www.flashsale-today.shop",
                 "cheapflights-now.store"],
    "phone": ["9812345670", "8800765432", "7011223344", "+91 9900112233"],
    "job": ["Work from home and earn Rs 3,000 daily. No experience needed. WhatsApp us now.",
            "Part-time job offer: like videos and earn money every day. Message to join.",
            "Earn passive income with our trading group, 30% monthly returns guaranteed.",
            # investment / ponzi lures
            "Invest Rs 5,000 today and get Rs 25,000 in 10 days. 100% guaranteed returns.",
            "Double your money in one month with our crypto plan. Join now!",
            "Get rich fast: our stock tips group gives 40% profit every week.",
            "Put 20,000 in our scheme and earn 2,000 daily for life. Limited slots.",
            "Secret investment trick banks don't want you to know, triple your savings.",
            # task scams: small paid "tasks" that later demand a deposit
            "Simple online task: review restaurants on Maps and get paid Rs 150 per review. Message HR on Telegram.",
            "Hiring now! Subscribe to YouTube channels and earn Rs 50 per task, payment same day.",
            "Part-time job for housewives and students, earn up to Rs 8,000 weekly. Limited vacancies, join fast.",
            "Get paid daily for giving 5-star ratings to products online. Contact our coordinator on WhatsApp.",
            "Data entry work from mobile, Rs 25,000 per month guaranteed. Small registration fee only."],
}
MAL_MED = [
    "{dl_open} {dl_thing}",
    "Try this {app_kind}, it is really good: {shop_url}",
    "{dl_thing} {dl_close}",
]
MM_SLOTS = {
    "dl_open": ["Hey, you should check this out.", "Bro, found something useful.", "Hi all,", "Sharing for everyone."],
    "dl_thing": ["Get the free video downloader from our website.", "Download the new photo editor app from our site.",
                 "Our free antivirus scanner is available on our website.", "There is a free movie streaming app on this site."],
    "dl_close": ["It is totally free.", "Works on every phone.", "Everyone is using it now."],
    "app_kind": ["game", "VPN app", "wallpaper app", "battery saver", "screen recorder"],
    "shop_url": ["freeapps-hub.store", "www.getapp-now.shop", "apkworld-free.store"],
}
BLACK_MED = [
    "{press}",
    "{press} {press_close}",
]
KM_SLOTS = {
    "press": ["Return my money this week or there will be trouble.", "You will regret ignoring my messages.",
              "I know what you did last year.", "Stop avoiding me, or I will come to your house and talk to your family.",
              "Settle the dues soon, otherwise I will have to take other steps.", "Don't think you can just disappear on me.",
              "Clear what you owe by Sunday or everyone will hear my side of the story.",
              "If you keep ignoring me, I'll make sure people know what kind of person you are.",
              "Send the money you promised, otherwise I'm telling your friends everything.",
              "You'll pay for what you did to me, one way or another.",
              "Answer my calls or I'll spread the word about you in the colony."],
    "press_close": ["Think about it.", "Last warning.", "You know what I mean.", "Reply soon."],
}
OPSEC_MED = [
    "{c_open} {c_q}",
    "{c_q}",
    "{c_q} {c_close}",
]
OM_SLOTS = {
    "c_open": ["Hey,", "Just asking,", "Out of curiosity,", "Hi bhai,", "Sir,"],
    "c_q": ["which city are you posted in nowadays?", "how often do you get leave from the base?",
            "is your posting a field area or a peace station?", "do you live inside the cantonment?",
            "how long will you stay at this posting?", "what is the routine like at your camp?",
            "do you get to use your phone at the post?", "is it far from the border where you are?"],
    "c_close": ["Just wondering.", "Asking for a friend.", "No reason."],
}

# ---- extra HIGH: realistic email-form and impersonation attacks ----------
HIGH_EXTRA = [
    (2, "Subject: {e_subj}\nFrom: {e_from}\nDear {who}, {problem} {action} {url} {urgency}"),
    (2, "This is {officer} from {branch}. I am in a meeting and cannot talk. {imp_ask}"),
    (2, "{brand_u} helpdesk: {problem} Share {secret} with our executive on WhatsApp {phone} to continue."),
    (3, "Subject: {e_subj}\nFrom: {e_from}\n{lure} Open the attachment {file} and {exec}."),
    (3, "{auth} {lure} The new version of the {app} is not on the Play Store. Download {file} and allow unknown sources."),
    (5, "{pretext} Could you tell me {op_detail}? {casual}"),
    (5, "{c_open} {op_detail_q} {casual}"),
    (4, "{have} {pay_ask}, otherwise {who_sees} will see it."),
    (1, "{flatter} Please send {h_media} and tell me {h_detail}."),
]
HX_SLOTS = {
    "e_subj": ["Mandatory account re-validation", "Pending pension action", "Security upgrade required",
               "Revised posting order", "Pay revision notice"],
    "e_from": ["IT Helpdesk <support@defence-mail-verify.com>", "SPARSH Support <noreply@sparsh-update.xyz>",
               "Records Office <records@army-records.online>", "Pay Cell <paycell@pcda-portal.top>"],
    "officer": ["Col Sharma", "Brig Verma", "Maj Rathore", "Lt Col Iyer"],
    "branch": ["MS branch", "the records office", "the pay cell", "station HQ"],
    "imp_ask": ["Send me the OTP you just received, it is needed for your posting order.",
                "Urgently share your army ID and login password to update your records.",
                "Please buy four gift cards and send me the codes, I will pay you back today."],
    "secret": ["your card number and CVV", "your OTP", "your net-banking password", "your service number and PIN"],
    "phone": ["9812345670", "8800765432", "7011223344"],
    "app": ["Hamraaz app", "welfare app", "secure chat app", "pay slip viewer"],
    "op_detail": ["how many troops are at your post", "which radars are in your sector",
                  "the timings of your night patrols", "when the convoy will move and how many vehicles",
                  "what frequencies your signals unit uses"],
    "op_detail_q": ["how many soldiers are at your post right now?", "when is your unit moving and by which route?",
                    "which missile systems were inducted in your formation?", "what time do the night patrols go out?"],
    "c_open": ["Hey,", "Bhai,", "Sir,", "Just curious,"],
    "h_media": ["a selfie in uniform", "a photo of your camp", "a video of your bunker", "your live location"],
    "h_detail": ["which unit you are in", "where your camp is", "when you are moving next", "your duty timings"],
}

# ---- extra LOW: genuine transactional notifications ----------------------
# Real bank / UPI / OTP-delivery SMS share every keyword with phishing (account,
# salary, Rs, OTP) but carry no link and ask for nothing; v4.0 had never seen one.
TRANSACTIONAL = [
    "Your {bank} account XX{d4} has been credited with {money} on {date} by {credit_src}. Avl bal {money}. {never}",
    "{money} debited from {bank} a/c XX{d4} on {date} for {debit_for}. Not you? Call {bank} customer care. {never}",
    "{otp} is your OTP for {otp_for}. Valid for 10 minutes. {never} -{bank}",
    "Dear customer, your {bank} credit card bill of {money} is due on {date}. Pay via the {bank} app or net banking.",
    "Payment of {money} to {payee} via UPI was successful. UPI Ref No {d4}{d4}{d4}.",
    "Your pension of {money} for {month} has been credited to your {bank} account. -{pension_src}",
    "{bank}: Salary of {money} for {month} credited to a/c XX{d4}. Avl bal {money}.",
    "Your recharge of {money} for mobile {phone_m} is successful. Validity 28 days.",
]
TX_SLOTS = {
    "bank": ["SBI", "HDFC Bank", "ICICI Bank", "PNB", "Axis Bank", "Bank of Baroda", "Canara Bank"],
    "d4": ["4821", "0937", "6150", "2294", "7703", "3368"],
    "money": ["Rs 68,450.00", "Rs 1,250", "INR 54,300.00", "Rs 2,10,500", "Rs 899", "Rs 12,000.00", "INR 3,499"],
    "date": ["01-12", "15-Nov-26", "03/12/2026", "28-11", "today"],
    "credit_src": ["NEFT from PCDA(O) PUNE", "salary credit", "IMPS", "transfer from Rajesh K"],
    "debit_for": ["UPI/swiggy", "POS at CSD canteen", "ATM withdrawal", "NEFT to self", "electricity bill"],
    "never": ["Never share OTP with anyone.", "Bank never asks for OTP or PIN.", "Do not share your OTP/PIN with anyone.", ""],
    "otp": ["482913", "120774", "905316", "338201"],
    "otp_for": ["login to net banking", "your transaction of Rs 1,250", "IRCTC booking", "Aadhaar update you requested"],
    "payee": ["Ramesh Kirana Store", "IRCTC", "CSD Canteen", "Jio Prepaid"],
    "month": ["November 2026", "Oct-2026", "December"],
    "pension_src": ["SPARSH", "DPDO", "PCDA (P) Allahabad"],
    "phone_m": ["98XXXXXX12", "70XXXXXX45"],
}

# ---- extra HIGH: Hinglish / romanised-Hindi attacks ----------------------
HINGLISH_HIGH = [
    (5, "{hg_open} {hg_opsec} {hg_tail}"),
    (5, "{hg_opsec} {hg_opsec2}"),
    (2, "{hg_open} {hg_phish}"),
    (1, "{hg_honey}"),
    (4, "{hg_black}"),
    (3, "{hg_mal}"),
]
HG_SLOTS = {
    "hg_open": ["Bhai,", "Yaar,", "Sir ji,", "Arre bhai", "Dost,", "Jai Hind ji,"],
    "hg_opsec": ["tumhari unit kab move kar rahi hai?", "convoy kitne baje niklega aur kaunse route se?",
                 "post pe abhi kitne jawan hai?", "kitni gaadiyan ja rahi hai {place} ke liye?",
                 "naya missile system kahan deploy hua hai?", "night patrol kitne baje nikalti hai?",
                 "tumhari battery ki location kya hai abhi?", "exercise ke liye regiment kab nikal raha hai?"],
    "hg_opsec2": ["Bas aise hi pooch raha hoon.", "Kisi ko nahi bataunga.", "Mera cousin bhi saath aana chahta hai.",
                  "Ghar wale pooch rahe the."],
    "hg_tail": ["Bata do na.", "Jaldi batao.", "Bas jaan na tha."],
    "hg_phish": ["canteen card band ho jayega, OTP bhej do verify karne ke liye.",
                 "pension ruk gayi hai, is link pe service number aur PIN daalo: {url}",
                 "salary account KYC pending hai, card number aur CVV WhatsApp karo.",
                 "aapka arrears aaya hai, claim karne ke liye OTP batao."],
    "hg_honey": ["Jaanu video call karo na apne bunker se, dekhna hai tum kahan rehte ho.",
                 "Baby apni uniform wali photo bhejo aur batao abhi kaunsi post pe ho.",
                 "Mujhe tumhari bahut yaad aati hai, apni live location bhejo na please.",
                 "Tum itne handsome ho, batao na tumhari unit kahan hai abhi?"],
    "hg_black": ["Tumhara video mere paas hai. Paise bhejo warna CO aur ghar walon ko bhej dungi.",
                 "Chats ke screenshot rakhe hai maine. Unit ki list bhejo nahi to sab viral kar dunga.",
                 "Agar kal tak 50 hazaar nahi bheje to tumhari photos sabko dikha dungi."],
    "hg_mal": ["Ye naya app install karo, Play Store pe nahi hai: {file}",
               "Bhai ye file khol ke dekho, posting list hai: {file}",
               "Sir ye update daal lo phone mein warna app band ho jayega: {file}"],
}
# advance-fee marketplace scam: "army officer" selling a vehicle / item, demands payment first
HIGH_EXTRA += [(2, "{olx_open} {olx_item} {olx_excuse} {olx_pay}")]
HG_SLOTS.update({
    "olx_open": ["Hello,", "Hi sir,", "Namaste,", "Dear buyer,"],
    "olx_item": ["I am selling my scooty at a low price.", "My car is for sale, only 2 years old.",
                 "Selling my sofa set and fridge urgently due to transfer.", "Bike for sale, very good condition."],
    "olx_excuse": ["I am in the army and just got transferred, so I can't meet.", "I am posted at the airport CISF unit, cannot come out.",
                   "I am an army officer, the item will come through army courier."],
    "olx_pay": ["Pay Rs 3,000 advance on UPI and it will be delivered.", "Send the gate pass charges on Google Pay first.",
                "Transfer the courier fee to my UPI ID and I will dispatch today.", "Scan the QR code I sent to pay the token amount."],
})
HIGH_EXTRA += HINGLISH_HIGH
HX_SLOTS.update(HG_SLOTS)

# ---- extra LOW: neutral / off-topic input --------------------------------
# What evaluators type to probe a classifier: gibberish, filler text, test pings,
# questions *about* security, third-person news. With no such data an unsure
# severity head spreads its mass over all tiers and lands at ~50 ("medium").
NEUTRAL = [
    "{test_msg}", "{question}", "{news}", "{filler}", "{code}", "{gib}", "{gib} {gib}", "{punct}",
]
NT_SLOTS = {
    "test_msg": ["test", "testing 123", "This is a test message.", "Just checking if this works.", "hello world",
                 "sample input for the demo", "dummy text here", "check check", "Trying the system once.", "abc"],
    "question": ["Is this message safe?", "How does this system work?", "What is phishing?", "How can I stay safe online?",
                 "Can you check this for me?", "What is a honeytrap?", "How do I report a cyber crime?",
                 "Which apps are safe to install?", "What should I do if I get a suspicious call?",
                 "Can you tell me if my phone is secure?", "What does OPSEC mean?", "How do I make a strong password?",
                 "Is it safe to use public Wi-Fi?", "What is two-factor authentication?"],
    "news": ["Police in {city} arrested a gang that cheated veterans by posing as pension officials.",
             "A new report says phishing attacks on government employees rose sharply this year.",
             "CERT-In has issued an advisory about malware spreading through fake apps.",
             "The army held a cyber security awareness week at {place} cantonment.",
             "Researchers found a spyware campaign targeting soldiers through dating apps.",
             "Banks have warned customers about fraudsters asking for OTPs on calls.",
             "The government launched helpline 1930 to report online financial fraud.",
             "An article explains how honeytraps are used to steal military secrets.",
             "Cyber experts advise people to avoid clicking unknown links in SMS messages."],
    "filler": ["Lorem ipsum dolor sit amet, consectetur adipiscing elit.",
               "The quick brown fox jumps over the lazy dog.", "Sed ut perspiciatis unde omnis iste natus error sit voluptatem.",
               "It was a bright cold day in April, and the clocks were striking thirteen.",
               "Water boils at 100 degrees Celsius at sea level.", "The capital of India is New Delhi.",
               "Mathematics is the language of science.", "Rain is expected in the evening."],
    "code": ["print('hello')", "for i in range(10): print(i)", "SELECT * FROM users;", "console.log('test');",
             "<html><body>Hello</body></html>", "def add(a, b): return a + b"],
    "gib": ["asdf", "qwerty", "zxcvbn", "lkjhg", "poiuy", "mnbvc", "hjkl", "fghj", "xyz", "aaaa", "blah blah", "hmm",
            "12345", "98765", "0000", "abcd efgh", "jfkdls", "wqeqwe"],
    "punct": ["!!!!", "????", "....", "!!! ??? ...", "---", "***", "😀😀😀", "👍", "🔥🔥", "🙂🙂", "#####", "@@@@"],
}

# ---- extra MEDIUM: compromise scares and bank-caller pretexts ------------
SCARE_MED = [
    "{scare} {scare_act}",
    "Hello {who2}, I am calling from your {org}. {verify_soft}",
    "{org} alert: {scare} {scare_act}",
]
SM_SLOTS = {
    "scare": ["Your account has been hacked.", "Suspicious login detected on your account.",
              "Your phone has been infected with a virus.", "Someone is trying to access your email.",
              "Your mobile number will be disconnected today.", "Your SIM card will be blocked in 2 hours."],
    "scare_act": ["Contact us immediately.", "Call our support team now.", "Reply to this message to secure it.",
                  "Contact customer care for help.", "Call back on this number urgently."],
    "who2": ["sir", "madam", "customer", "dear", "ji"],
    "org": ["bank", "telecom company", "customer care", "head office", "insurance company", "courier company"],
    "verify_soft": ["Please confirm your details.", "We need to verify your account information.",
                    "Please confirm your date of birth and address.", "Kindly confirm your registered details."],
}

# ---- Devanagari --------------------------------------------------------------
DEV_LOW = ["{dev_low}"]
DL_SLOTS = {"dev_low": [
    "कल शाम को सब लोग घर पर खाना खाएंगे।", "मम्मी ने कहा है दिवाली पर घर जरूर आना।", "परेड कल सुबह आठ बजे होगी।",
    "आज मेस में पनीर बना है।", "बच्चों की परीक्षा अगले हफ्ते है।", "पापा की तबीयत अब ठीक है, चिंता मत करो।",
    "छुट्टी का आवेदन मंजूर हो गया है।", "मीटिंग का समय बदलकर दो बजे कर दिया गया है।", "जन्मदिन की बहुत बहुत शुभकामनाएं!",
    "अपना OTP किसी के साथ साझा न करें।", "बैंक कभी भी फोन पर पासवर्ड नहीं मांगता।", "ट्रेन का टिकट कन्फर्म हो गया।",
    "कल क्रिकेट मैच देखने चलेंगे।", "सुबह की पीटी के बाद चाय पीते हैं।", "आपके खाते में वेतन जमा कर दिया गया है।",
    "भाई शाम को फोन करना, कुछ जरूरी बात करनी है।", "दीदी की शादी की तारीख तय हो गई है।", "कल बारिश होने की संभावना है।",
    "यूनिट का खेल दिवस शनिवार को होगा, सभी परिवार आमंत्रित हैं।", "सभी जवान कल की ड्रिल के लिए समय पर पहुंचें।",
    "राशन की सप्लाई सोमवार को आएगी।", "नए साल की हार्दिक शुभकामनाएं।", "माँ ने लड्डू भेजे हैं, पार्सल ले लेना।",
    "कैंटीन मंगलवार को बंद रहेगी।", "आज का मौसम बहुत अच्छा है।", "बेटा पढ़ाई पर ध्यान देना।", "होली पर घर आ रहे हो ना?",
    "मेडिकल कैंप गुरुवार को लगेगा, अपने कागज़ साथ लाएं।", "ड्यूटी रोस्टर नोटिस बोर्ड पर लगा दिया गया है।",
    "आप कैसे हैं? घर पर सब ठीक है?", "धन्यवाद, आपकी मदद से काम हो गया।", "शाम को मंदिर चलेंगे।",
    "लाइब्रेरी की किताबें शुक्रवार तक लौटा दें।", "कल छुट्टी है, आराम करो।", "ट्रेनिंग शेड्यूल ऑफिस में लगा है।"]}
DEV_HIGH = [
    (5, "{dev_opsec}"), (2, "{dev_phish}"), (1, "{dev_honey}"), (4, "{dev_black}"), (3, "{dev_mal}"),
]
DEV_SLOTS = {
    "dev_opsec": ["आपकी यूनिट अभी कहाँ तैनात है?", "काफिला कल कितने बजे निकलेगा और कितनी गाड़ियाँ हैं?",
                  "पोस्ट पर अभी कितने जवान हैं?", "नई मिसाइल कहाँ लगाई गई है?", "रात की गश्त कितने बजे निकलती है?",
                  "आपकी रेजिमेंट कब और कहाँ जा रही है? बस ऐसे ही पूछ रहा हूँ।", "बॉर्डर पर कौन से हथियार तैनात हैं?"],
    "dev_phish": ["आपका पेंशन खाता बंद हो जाएगा, तुरंत ओटीपी भेजें।", "कैंटीन कार्ड ब्लॉक हो गया है, कार्ड नंबर और CVV भेजें।",
                  "आपका KYC अधूरा है, इस लिंक पर पासवर्ड डालें: {url}", "आपका एरियर आया है, सर्विस नंबर और ओटीपी बताएं।"],
    "dev_honey": ["जानू, अपने बंकर से वीडियो कॉल करो ना।", "अपनी वर्दी वाली फोटो भेजो और बताओ अभी किस पोस्ट पर हो।",
                  "मुझे तुम्हारी बहुत याद आती है, अपनी लाइव लोकेशन भेजो।", "तुम बहुत हैंडसम हो, अपनी यूनिट का नाम बताओ ना।"],
    "dev_black": ["तुम्हारा वीडियो मेरे पास है, पैसे भेजो वरना सबको भेज दूंगी।", "यूनिट की लिस्ट भेजो नहीं तो तुम्हारी फोटो वायरल कर दूंगा।",
                  "कल तक पचास हजार नहीं भेजे तो तुम्हारे सीओ को सब बता दूंगी।"],
    "dev_mal": ["यह नया ऐप इंस्टॉल करो, प्ले स्टोर पर नहीं है: {file}", "पोस्टिंग लिस्ट इस फाइल में है, खोलकर देखो: {file}"],
}
HIGH_EXTRA += DEV_HIGH
HX_SLOTS.update(DEV_SLOTS)

GRADED_SPECS = [
    # (category, tier, templates, slots)
    (0, 0, BENIGN_HARD, {**B_SLOTS, **BH_SLOTS, **BH_SLOTS_SOCIAL}),
    (0, 0, TRANSACTIONAL, TX_SLOTS),
    (0, 0, NEUTRAL, {**NT_SLOTS, **COMMON}),
    (0, 0, DEV_LOW, DL_SLOTS),
    (2, 1, SCARE_MED, SM_SLOTS),
    (1, 1, HONEY_MED, HM_SLOTS),
    (2, 1, PHISH_MED, PM_SLOTS),
    (3, 1, MAL_MED, MM_SLOTS),
    (4, 1, BLACK_MED, KM_SLOTS),
    (5, 1, OPSEC_MED, OM_SLOTS),
]
ALL_SLOTS = {**H_SLOTS, **P_SLOTS, **M_SLOTS, **K_SLOTS, **O_SLOTS, **HX_SLOTS}


def _fill(template, slots, rng):
    out = template
    for _ in range(4):  # slots may expand into other slots
        if "{" not in out:
            break
        def repl(key):
            if key == "url":
                return _url(rng)
            pool = slots.get(key) or COMMON.get(key)
            return rng.choice(pool) if pool else "{" + key + "}"
        import re
        out = re.sub(r"\{(\w+)\}", lambda m: repl(m.group(1)), out)
    return out


def _perturb(text, rng):
    """Light human noise: casing, dropped punctuation, typos, emoji."""
    r = rng.random()
    if r < 0.12:
        text = text.lower()
    elif r < 0.18:
        text = text.replace(",", "").replace(".", "")
    if rng.random() < 0.1:
        words = text.split()
        if len(words) > 4:
            i = rng.randrange(len(words))
            w = words[i]
            if len(w) > 4:
                j = rng.randrange(1, len(w) - 1)
                words[i] = w[:j] + w[j + 1] + w[j] + w[j + 2:]
            text = " ".join(words)
    if rng.random() < 0.08:
        text += " " + rng.choice(["🙂", "😊", "🙏", "👍", "❤️", "😘"])
    return text


def generate(per_class=220, seed=42):
    """Return list of (text, category_id)."""
    rng = random.Random(seed)
    rows = []
    for cat, templates, slots in CLASS_SPECS:
        seen = set()
        tries = 0
        while len(seen) < per_class and tries < per_class * 30:
            tries += 1
            t = _perturb(_fill(rng.choice(templates), slots, rng), rng)
            if t not in seen:
                seen.add(t)
        rows.extend((t, cat) for t in seen)
    return rows


def _sample_unique(rng, n, make):
    seen, tries = set(), 0
    while len(seen) < n and tries < n * 30:
        tries += 1
        seen.add(_perturb(make(), rng))
    return seen


def _compose(rows, rng, n_each=150):
    """Multi-sentence messages: several benign sentences, optionally hiding one threat sentence.

    Teaches the model that a long message is judged by its worst sentence, not its overall tone,
    and that long benign announcements are not suspicious just for being long.
    """
    benign = [t for t, c, s in rows if s == 0 and len(t.split()) >= 6 and "{" not in t]
    by_tier = {1: [(t, c) for t, c, s in rows if s == 1 and "{" not in t],
               2: [(t, c) for t, c, s in rows if s == 2 and "{" not in t]}
    out = []
    for _ in range(n_each):
        out.append((" ".join(rng.sample(benign, rng.randint(3, 5))), 0, 0))
    for tier, pool in by_tier.items():
        for _ in range(n_each):
            parts = rng.sample(benign, rng.randint(2, 3))
            bad, cat = rng.choice(pool)
            parts.insert(rng.randint(0, len(parts)), bad)
            out.append((" ".join(parts), cat, tier))
    return out


def generate_graded(per_class=220, per_medium=130, per_hard_benign=260, per_high_extra=40, seed=42):
    """Return list of (text, category_id, tier) with tier 0=LOW, 1=MEDIUM, 2=HIGH.

    Original class templates keep their meaning: benign -> LOW, threats -> HIGH.
    """
    rows = [(t, c, 0 if c == 0 else 2) for t, c in generate(per_class=per_class, seed=seed)]
    rng = random.Random(seed + 1)
    for cat, tier, templates, slots in GRADED_SPECS:
        n = per_hard_benign if tier == 0 else per_medium
        rows += [(t, cat, tier) for t in _sample_unique(rng, n, lambda: _fill(rng.choice(templates), slots, rng))]
    for cat, template in HIGH_EXTRA:
        rows += [(t, cat, 2) for t in _sample_unique(rng, per_high_extra, lambda: _fill(template, ALL_SLOTS, rng))]
    rows += _compose(rows, rng)
    # a text generated by two specs keeps its first label only
    out, seen = [], set()
    for r in rows:
        if r[0] not in seen:
            seen.add(r[0])
            out.append(r)
    return out


if __name__ == "__main__":
    data = generate()
    rng = random.Random(1)
    for cat in range(6):
        sample = [t for t, c in data if c == cat]
        print(cat, len(sample))
        for t in rng.sample(sample, 3):
            print("   ", t)
