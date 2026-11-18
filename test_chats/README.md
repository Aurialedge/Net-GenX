# Test chat histories

Sample conversations for the portal's **Chat History** tab, which runs the 5-layer
Counter-Intelligence Shield over a whole conversation instead of one message.

**How to test:** log in → *Chat History* tab → *Upload chat export* (pick a file below) →
**1. Read chat** → select the participant in the "You are" column → **2. Analyze conversation**.

| File | Format | You are | Expected result | What it shows |
|---|---|---|---|---|
| `01_honeytrap_whatsapp_android.txt` | WhatsApp (Android) | Vikram Singh | **Escalated to CERT-Army** | Flattery → "our little secret" → posting, uniform photo, unit movement, video call from camp; keeps asking after two refusals |
| `02_slow_elicitation_whatsapp_android.txt` | WhatsApp (Android) | Arjun | **Escalated** | No single message is alarming (worst one scores ~70 alone); the trajectory RAPPORT → ELICITATION plus probing after "Can't say much" escalates the chat |
| `03_sextortion_whatsapp_iphone.txt` | WhatsApp (iPhone) | Major Rathore | **Escalated** | Video call → "I recorded it" → pay or send the duty roster |
| `04_fake_recruiter_telegram.json` | Telegram JSON export | Col (Retd) Mehta | **Escalated** | Fake consultancy job → radar/missile/unit locations; continues after "it is classified" |
| `05_otp_scam.csv` | CSV (`sender,message`) | Sub. Kumar | **Escalated** | Fake CSD canteen staff asks for the OTP |
| `06_hinglish_opsec_whatsapp.txt` | WhatsApp (Android), Hinglish | Deepak | **Escalated** | "Friend" asks about unit move, convoy timing, troop count; keeps asking after "nahi bata sakta" |
| `07_benign_family_whatsapp_iphone.txt` | WhatsApp (iPhone) | Rahul | **Low risk** | Ordinary family chat (Hinglish) |
| `08_benign_unit_group_whatsapp.txt` | WhatsApp (Android), group | Nk Sharma | **Low risk** | Unit group chat full of military words (PT, lecture, sports day) but no threat |
| `09_benign_unnamed_paste_with_times.txt` | Copy-paste, no names, time on its own line | Not in this chat (or Person 1/2) | **Low risk** | Everyday small talk pasted without sender names; time lines are read as timestamps, speakers assumed to alternate |

The files reproduce real export details (WhatsApp's invisible characters, system notices,
`<Media omitted>`, multi-line messages, Telegram's rich-text arrays), so they also test the parser.
They are checked automatically by `ml_service/tests/test_netgenx_ai.py::test_sample_chat_histories`.

To make your own: in WhatsApp open a chat → ⋮ → More → **Export chat** → *Without media*.
Plain `Name: message` lines (one per line) also work, as does pasting the text straight into the tab.
