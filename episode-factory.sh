#!/usr/bin/env bash
# episode-factory.sh v2.1
set -euo pipefail
W=720; H=1280; FPS=25
LIMIT=25000000
INTRO_SECS=8
DUR_TOL=0.5
ROOT="$(cd "$(dirname "$0")" && pwd)"
cd "$ROOT"
die(){ echo "FACTORY ERROR: $*" >&2; exit 1; }
say(){ echo "[factory] $*"; }
need(){ for c in ffmpeg ffprobe jq sha256sum awk; do command -v "$c" >/dev/null 2>&1 || die "missing $c"; done; }
req(){ jq -er "$2" "$1" 2>/dev/null || die "$1 missing $2"; }
opt(){ jq -r "$2 // empty" "$1"; }
dur(){ ffprobe -v error -show_entries format=duration -of csv=p=0 "$1"; }
has_audio(){ [ -n "$(ffprobe -v error -select_streams a -show_entries stream=index -of csv=p=0 "$1" | head -n1)" ]; }
check_one(){
  need; [ -n "$SONG" ] || die "--song required"
  SRC="$ROOT/releases/demo-$SONG"
  [ -f "$SRC/release.json" ] || die "missing $SRC/release.json"
  [ -f "$SRC/media.json" ] || die "missing $SRC/media.json"
  [ -f "$SRC/episode.json" ] || die "missing $SRC/episode.json"
  if [ -n "$(opt "$SRC/release.json" .sound_profile)" ] && [ "$SONG" = "democracy-eulogy" ]; then die "democracy-eulogy must not use sound profile"; fi
  local exp intro main_d total main
  exp="$(req "$SRC/release.json" .expected_duration_s)"
  intro="$(req "$SRC/release.json" .intro_secs)"
  [ "$intro" = "8" ] || die "intro_secs must be 8, got $intro"
  main="$(req "$SRC/media.json" .main_video)"
  [ -f "$SRC/$main" ] || die "missing main $SRC/$main"
  main_d="$(jq -r ".main_trim_to_s // empty" "$SRC/media.json")"; [ -n "$main_d" ] || main_d="$(dur "$SRC/$main")"
  total="$(awk -v i="$intro" -v m="$main_d" 'BEGIN{printf "%.2f", i+m}')"
  awk -v t="$total" -v e="$exp" -v tol="$DUR_TOL" 'BEGIN{d=t-e; if(d<0)d=-d; exit !(d<=tol)}' || die "plan ${total}s vs expected ${exp}s"
  say "check passed: $SONG plan ${total}s = 8 + ${main_d}s"
}
build_one(){
  need; check_one
  SRC="$ROOT/releases/demo-$SONG"; OUT="$ROOT/releases/$SONG"
  local rel="$SRC/release.json" med="$SRC/media.json"
  local cap main exp
  cap="$SRC/$(req "$rel" .captions)"
  [ -f "$cap" ] || die "missing captions $cap"
  main="$SRC/$(req "$med" .main_video)"
  exp="$(req "$rel" .expected_duration_s)"
  WORK="$(mktemp -d)"; # trap disabled for debug
trap 'rm -rf "$WORK"' EXIT
  say "step 1/4 intro card 8s"
  ffmpeg -nostdin -hide_banner -loglevel error -y -f lavfi -i color=c=black:s=${W}x${H}:r=$FPS:d=$INTRO_SECS -f lavfi -i anullsrc=r=44100:cl=stereo -vf "drawtext=text='GLOBAL FOOTPRINTS':fontsize=56:fontcolor=0xFFD700:x=60:y=400,drawtext=text='NEFERTITI + DJ DEHRTAY DOG':fontsize=40:fontcolor=0xFFD700:x=60:y=500,drawtext=text='PHARAOH CHAMBER':fontsize=44:fontcolor=0xFFD700:x=60:y=600,drawtext=text='Democracy\x27s Eulogy':fontsize=44:fontcolor=0xFFD700:x=60:y=700" -c:v libx264 -pix_fmt yuv420p -r $FPS -c:a aac -b:a 128k -shortest "$WORK/intro-card.mp4"
  say "step 2/4 join intro + main"
  ffmpeg -nostdin -hide_banner -loglevel error -y -i "$main" -t 168.24 -vf "scale=720:1280,fps=25,format=yuv420p" -c:v libx264 -preset veryfast -crf 23 -video_track_timescale 12800 -c:a aac -b:a 128k -ar 44100 -ac 2 "$WORK/main-trim.mp4"
  printf "file '%s'\nfile '%s'\n" "$WORK/intro-card.mp4" "$WORK/main-trim.mp4" > "$WORK/join.txt"
  ffmpeg -nostdin -hide_banner -loglevel error -y -f concat -safe 0 -i "$WORK/join.txt" -c copy "$WORK/joined-nocap.mp4"
  say "step 3/4 burn captions"
  ffmpeg -nostdin -hide_banner -loglevel error -y -i "$WORK/joined-nocap.mp4" -vf "subtitles=${cap}:force_style='FontSize=16,Alignment=2,PrimaryColour=&HFFFFFF&,OutlineColour=&H000000&,Outline=1,Shadow=0,MarginV=40'" -c:v libx264 -preset veryfast -crf 23 -c:a copy -movflags +faststart "$WORK/master-unc.mp4"
  say "step 4/4 compress to <25M"
  ffmpeg -nostdin -hide_banner -loglevel error -y -i "$WORK/master-unc.mp4" -map 0:v:0 -an -vf "scale=720:1280,fps=25" -c:v libx264 -preset medium -b:v 920k -maxrate 1400k -bufsize 2800k -pix_fmt yuv420p -r 25 -pass 1 -passlogfile "$WORK/t4" -f null /dev/null
  ffmpeg -nostdin -hide_banner -loglevel error -y -i "$WORK/master-unc.mp4" -map 0:v:0 -map 0:a:0 -vf "scale=720:1280,fps=25" -c:v libx264 -preset medium -b:v 920k -maxrate 1400k -bufsize 2800k -pix_fmt yuv420p -r 25 -pass 2 -passlogfile "$WORK/t4" -c:a aac -b:a 64k -ac 2 -movflags +faststart "$WORK/master.mp4"
  local size d w h fr
  size="$(stat -c %s "$WORK/master.mp4")"; [ "$size" -lt "$LIMIT" ] || die "master $size over limit"
  d="$(dur "$WORK/master.mp4")"
  w="$(ffprobe -v error -select_streams v:0 -show_entries stream=width -of csv=p=0 "$WORK/master.mp4")"
  h="$(ffprobe -v error -select_streams v:0 -show_entries stream=height -of csv=p=0 "$WORK/master.mp4")"
  fr="$(ffprobe -v error -select_streams v:0 -show_entries stream=r_frame_rate -of csv=p=0 "$WORK/master.mp4")"
  [ "$w" = "$W" ] && [ "$h" = "$H" ] || die "resolution ${w}x${h}"
  has_audio "$WORK/master.mp4" || die "no audio"
  awk -v t="$d" -v e="$exp" -v tol="$DUR_TOL" 'BEGIN{x=t-e; if(x<0)x=-x; exit !(x<=tol)}' || die "duration ${d}s vs ${exp}s"
  mkdir -p "$OUT"; mv "$WORK/master.mp4" "$OUT/master.mp4"
  cp "$rel" "$OUT/release.json"
  ( cd "$OUT" && sha256sum master.mp4 > master.sha256 && sha256sum -c master.sha256 >/dev/null )
  say "OK $SONG ${d}s ${w}x${h} $((size/1024)) KiB"
}
SONG=""; CMD="${1:-}"; shift || true
while [ $# -gt 0 ]; do case "$1" in --song) SONG="$2"; shift 2;; --all) SONG="__ALL__"; shift;; *) die "unknown $1";; esac; done
case "$CMD" in
  check) check_one;;
  build) if [ "$SONG" = "__ALL__" ]; then for r in releases/demo-*/release.json; do s="$(basename "$(dirname "$r")")"; s="${s#demo-}"; SONG="$s" build_one || echo "FAILED $s"; done; else build_one; fi;;
  *) echo "Usage: ./episode-factory.sh check|build --song <slug> | build --all"; exit 1;;
esac
