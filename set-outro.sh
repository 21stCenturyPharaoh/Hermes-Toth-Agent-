#!/bin/bash
set -e
# Usage: ./set-outro.sh "New Video File.mp4" "New Title" "captions/new-video.srt"
# Template: every new video becomes the outro — same slot, same Stage loader
# Example: ./set-outro.sh "$HOME/storage/downloads/My_New_Song_CAPTIONED.mp4" "My New Song" "captions/my-new-song.srt"
SRC="$1"
TITLE="$2"
CAPTIONS="${3:-captions/democracy-eulogy.srt}"
if [ -z "$SRC" ] || [ -z "$TITLE" ]; then
  echo 'Usage: ./set-outro.sh "Video.mp4" "Title" ["captions/file.srt"]'
  exit 1
fi
# If SRC is just a filename, assume Downloads
if [ ! -f "$SRC" ]; then SRC="$HOME/storage/downloads/$SRC"; fi
echo "SRC=$SRC"
echo "TITLE=$TITLE"
echo "CAPTIONS=$CAPTIONS"
# 1. Copy new video into generic slot — overwrites old outro
cp "$SRC" episodes/assets/outro-current.mp4
# 2. Get duration
DUR=$(ffprobe -v error -show_entries format=duration -of default=noprint_wrappers=1 episodes/assets/outro-current.mp4 | cut -d= -f2)
echo "DURATION=$DUR"
# 3. Update outro.json — Stage reads this, never hardcoded
python3 -c "
import json
p='episodes/assets/outro.json'
d=json.load(open(p, encoding='utf-8'))
d['title']='$TITLE'
d['video']='episodes/assets/outro-current.mp4'
d['captions']='$CAPTIONS'
d['duration']=float('$DUR')
d['slot']='outro-current'
json.dump(d, open(p,'w',encoding='utf-8'), ensure_ascii=False, indent=2)
print(json.dumps(d, ensure_ascii=False, indent=2))
"
ls -lh episodes/assets/outro-current.mp4 episodes/assets/outro.json
echo "DONE — new outro is: $TITLE"
echo "Next: git add + commit + push, then Stage ?v=<commit> will play it at end"
