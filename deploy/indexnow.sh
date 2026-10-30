#!/bin/bash
# Submit all site URLs to IndexNow (Bing, Yandex, Seznam, Naver…)
KEY="6efba006d1a47f81c4ea03d74abaa32f"
HOST="jsonsheet.com"
KEY_LOCATION="https://jsonsheet.com/$KEY.txt"
URLS=(
  "https://jsonsheet.com/"
  "https://jsonsheet.com/tools/"
  $(for s in json-to-csv csv-to-json json-to-markdown markdown-to-csv csv-to-markdown json-to-typescript csv-to-sql json-to-sql json-formatter tsv-to-json csv-dedupe csv-transpose; do echo "https://jsonsheet.com/tools/$s/"; done)
)
curl -s -X POST "https://api.indexnow.org/IndexNow"   -H "Content-Type: application/json"   -d "{\"host\":\"$HOST\",\"key\":\"$KEY\",\"keyLocation\":\"$KEY_LOCATION\",\"urlList\":[$(printf '"%s",' "${URLS[@]}" | sed 's/,$//')]}"
echo
