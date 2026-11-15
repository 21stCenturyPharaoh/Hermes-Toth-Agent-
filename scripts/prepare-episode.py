#!/usr/bin/env python3
# Repeatable Micdom episode preparation. The source JSON is never modified.
import argparse, copy, json, sys
from pathlib import Path

ROLES = ["welcome", "scripture_question", "history_context", "hebrews_teaching", "signoff"]
EXPRESSIONS = {"welcome", "thinking", "neutral", "nodding", "shocked", "breaking", "signoff"}
REGISTRY_URL = "https://registry.pharaoh-conglomerate.org"
STRIPE_URL = "https://donate.stripe.com/6oUdR80s82gJ1nx8N2f7i00"

DEFAULT_CTA_FIELDS = {
 "live_ctas": [
  {"segment":1,"id":"follow","text":"Follow Micdom AI Records so you do not miss our next broadcast."},
  {"segment":2,"id":"gift_rose","text":"Tap the screen, share the Live, and send DJ Dehrtay Dog a Rose if you would like. Gifts are always optional."},
  {"segment":3,"id":"audience_registry","text":"Where are you watching from? Put your country in the chat. Explore the Human Rights Angels Registry and its affiliate programs at registry.pharaoh-conglomerate.org."},
  {"segment":4,"id":"rumble_youtube","text":"Find Micdom AI Records on Rumble and YouTube at @MicdomAIRecords."},
  {"segment":5,"id":"stripe_routenote","text":"Support our work voluntarily through our official Stripe link, and discover our music on RouteNote by searching MicdomAIRecords."}
 ],
 "gift_ctas":[{"id":"rose","gift":"Rose","optional":True,"text":"Send DJ Dehrtay Dog a Rose if you would like. Gifts are optional."}],
 "traffic_ctas":[
  {"id":"registry","platform":"Human Rights Angels Registry","url":REGISTRY_URL,"text":"Explore the Registry and its affiliate programs."},
  {"id":"rumble","platform":"Rumble","handle":"@MicdomAIRecords","text":"Find Micdom AI Records on Rumble at @MicdomAIRecords."},
  {"id":"stripe","platform":"Stripe","url":STRIPE_URL,"voluntary":True,"text":"Support our work voluntarily through our official Stripe link."},
  {"id":"routenote","platform":"RouteNote","artist":"MicdomAIRecords","text":"Discover Micdom AI Records music on RouteNote by searching MicdomAIRecords."},
  {"id":"youtube","platform":"YouTube","handle":"@MicdomAIRecords","text":"Subscribe to Micdom AI Records on YouTube at @MicdomAIRecords."}
 ],
 "closing_cta":"Follow, share, and join us again. This is Nefertiti with DJ Dehrtay Dog, broadcasting from Monrovia to the world.",
 "pinned_comments":[
  "Follow Micdom AI Records. Registry and affiliate programs: https://registry.pharaoh-conglomerate.org | Rumble + YouTube: @MicdomAIRecords | RouteNote: MicdomAIRecords",
  "Optional support: https://donate.stripe.com/6oUdR80s82gJ1nx8N2f7i00. Gifts are voluntary; no Gift is required to participate."
 ],
 "cta_rotation":{"strategy":"per-segment","repeat_consecutive":False,"segment_order":[1,2,3,4,5]}
}
HALLEL_DISCLAIMER = ("The LARP is a game. The real Volunteer Exchange Portal remains the operational system for actual volunteer registration, missions, records, and recognition. The LARP adds the story; the Portal provides the structure. LARP points, badges, titles, and ranks are fictional heraldry — they carry no real-world authority, status, or guaranteed income. Actual volunteer activity and records remain subject to their actual terms, documentation, and responsible parties.")

def good_text(value, limit):
 if not isinstance(value,str): return False
 value=value.strip()
 return bool(value) and len(value)<=limit and not any(x in value.upper() for x in ("REPLACE ME","TODO","TBD","INSERT TEXT"))

def prepare_episode(source):
 if not isinstance(source,dict): raise ValueError("Episode JSON must be an object")
 episode=copy.deepcopy(source)
 for key,value in DEFAULT_CTA_FIELDS.items():
  if key not in episode or episode[key] is None: episode[key]=copy.deepcopy(value)
 if isinstance(episode.get("larp_posts"),dict) and not episode.get("standing_disclaimer"):
  episode["standing_disclaimer"]=HALLEL_DISCLAIMER
 return episode

def validate_episode(ep):
 errors=[]
 if not good_text(ep.get("title"),120): errors.append("episode.title is missing or invalid")
 if "subtitle" in ep and not good_text(ep.get("subtitle"),160): errors.append("episode.subtitle is invalid")
 segs=ep.get("segments")
 if not isinstance(segs,list) or len(segs)!=5:
  errors.append("segments must contain exactly five items"); segs=[]
 ctas=ep.get("live_ctas")
 if not isinstance(ctas,list) or len(ctas)!=5:
  errors.append("live_ctas must contain exactly five scheduled prompts"); ctas=[]
 for i,role in enumerate(ROLES):
  if i>=len(segs): break
  s=segs[i]
  if not isinstance(s,dict): errors.append(f"segment {i+1} must be an object"); continue
  if s.get("role")!=role: errors.append(f"segment {i+1} role must be {role}")
  if type(s.get("volume")) is not int or not 55<=s["volume"]<=85: errors.append(f"segment {i+1} volume must be 55–85")
  if not good_text(s.get("title"),100): errors.append(f"segment {i+1} title is missing or invalid")
  if not good_text(s.get("dialogue"),1200): errors.append(f"segment {i+1} dialogue is missing or invalid")
  if s.get("expression") not in EXPRESSIONS: errors.append(f"segment {i+1} expression is not allowlisted")
  if i==0 and s.get("expression")!="welcome": errors.append("segment 1 must use welcome")
  if i==4 and s.get("expression")!="signoff": errors.append("segment 5 must use signoff")
  if i<len(ctas):
   c=ctas[i]
   if not isinstance(c,dict) or c.get("segment")!=i+1 or not good_text(c.get("id"),60) or not good_text(c.get("text"),400):
    errors.append(f"CTA for segment {i+1} is missing or invalid")
   elif isinstance(s.get("dialogue"),str):
    extra=c["text"]+(ep.get("closing_cta","") if i==4 else "")
    if len(s["dialogue"].strip())+len(extra)+2>1200: errors.append(f"spoken text for segment {i+1} exceeds 1200 characters")
 gifts=ep.get("gift_ctas")
 if not isinstance(gifts,list) or not any(isinstance(x,dict) and x.get("id")=="rose" and x.get("gift")=="Rose" and x.get("optional") is True and good_text(x.get("text"),300) for x in gifts):
  errors.append("gift_ctas must include an optional Rose invitation")
 traffic=ep.get("traffic_ctas")
 if not isinstance(traffic,list): traffic=[]
 byid={x.get("id"):x for x in traffic if isinstance(x,dict)}
 checks={
  "registry":byid.get("registry",{}).get("url")==REGISTRY_URL,
  "rumble":byid.get("rumble",{}).get("handle")=="@MicdomAIRecords",
  "stripe":byid.get("stripe",{}).get("url")==STRIPE_URL and byid.get("stripe",{}).get("voluntary") is True,
  "routenote":byid.get("routenote",{}).get("artist")=="MicdomAIRecords",
  "youtube":byid.get("youtube",{}).get("handle")=="@MicdomAIRecords"
 }
 for name,ok in checks.items():
  if not ok: errors.append(f"traffic destination {name} is missing or incorrect")
 if not good_text(ep.get("closing_cta"),400): errors.append("closing_cta is required")
 comments=ep.get("pinned_comments")
 if not isinstance(comments,list) or not 1<=len(comments)<=10 or not all(good_text(x,700) for x in comments): errors.append("pinned_comments must contain 1–10 valid comments")
 rot=ep.get("cta_rotation")
 if not isinstance(rot,dict) or rot.get("repeat_consecutive") is not False or rot.get("segment_order")!=[1,2,3,4,5]: errors.append("cta_rotation must prevent consecutive repeats")
 larp=ep.get("larp_posts")
 if larp is not None:
  if not isinstance(larp,dict): errors.append("larp_posts must be an object")
  else:
   if type(larp.get("day")) is not int or larp["day"]<1: errors.append("larp_posts.day must be positive")
   if type(larp.get("episode")) is not int or larp["episode"]<0: errors.append("larp_posts.episode must be nonnegative; Episode 0 is valid")
   if not good_text(larp.get("title"),100): errors.append("larp_posts.title is required")
   if not good_text(larp.get("opening_lines"),1200): errors.append("larp_posts.opening_lines is required")
   play=larp.get("play_today")
   if not isinstance(play,list) or not 1<=len(play)<=12 or not all(good_text(x,300) for x in play): errors.append("larp_posts.play_today must contain 1–12 items")
   if not good_text(larp.get("chat_poll"),300): errors.append("larp_posts.chat_poll is required")
   if not good_text(larp.get("pinned_comment"),1000): errors.append("larp_posts.pinned_comment is required")
   if not good_text(larp.get("closing_cta"),500): errors.append("larp_posts.closing_cta is required")
   if not good_text(ep.get("standing_disclaimer"),2000): errors.append("standing_disclaimer is mandatory for LARP episodes")
 return errors

def main():
 p=argparse.ArgumentParser(description="Prepare a Micdom episode without changing its source.")
 p.add_argument("input",type=Path); p.add_argument("--output",type=Path); p.add_argument("--force",action="store_true")
 a=p.parse_args()
 try:
  source=json.loads(a.input.read_text(encoding="utf-8")); ep=prepare_episode(source); errors=validate_episode(ep)
  if errors:
   for e in errors: print("FAIL:",e)
   return 1
  if a.output:
   if a.output.resolve()==a.input.resolve(): print("FAIL: source file cannot be overwritten"); return 1
   if a.output.exists() and not a.force: print("FAIL: output exists; use a new name or --force"); return 1
   a.output.parent.mkdir(parents=True,exist_ok=True)
   a.output.write_text(json.dumps(ep,ensure_ascii=False,indent=2)+"\n",encoding="utf-8")
   print("Prepared copy:",a.output)
  for i,role in enumerate(ROLES,1): print(f"PASS: Segment {i} — {role}")
  for name in ("follow","gift_rose","audience_registry","rumble_youtube","stripe_routenote"): print("PASS: spoken CTA —",name)
  for name in ("registry","rumble","stripe","routenote","youtube"): print("PASS: verified destination —",name)
  print("PASS: optional Rose, CTA rotation, pinned comments and sign-off")
  if ep.get("larp_posts") is not None:
   print(f"PASS: H.A.L.L.EL Day {ep['larp_posts']['day']} — Episode {ep['larp_posts']['episode']}")
   print("PASS: mandatory standing disclaimer")
  print("READY FOR PREVIEW"); print("PRODUCTION NOT MODIFIED"); return 0
 except (OSError,json.JSONDecodeError,ValueError) as e:
  print("FAIL:",e); return 1

if __name__=="__main__": sys.exit(main())
