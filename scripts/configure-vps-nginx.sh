#!/usr/bin/env bash
set -euo pipefail

backup_dir="/var/backups/kaamsaathi-nginx/$(date -u +%Y%m%d%H%M%S)"
sudo mkdir -p "$backup_dir"

mapfile -t config_files < <(
  sudo grep -RIlE 'server_name[^;]*(inquiry\.business|smartdial\.online)' \
    /etc/nginx/sites-enabled /etc/nginx/conf.d 2>/dev/null || true
)

if [ "${#config_files[@]}" -eq 0 ]; then
  echo "No Nginx server block for the InquiryExperts domains was found."
  exit 1
fi

changed=0
backup_index=0
for config_file in "${config_files[@]}"; do
  target_file="$(sudo readlink -f "$config_file")"
  case "$target_file" in
    /etc/nginx/*) ;;
    *)
      echo "Refusing to edit unexpected Nginx path: $target_file"
      exit 1
      ;;
  esac

  backup_file="$backup_dir/$(basename "$target_file").$backup_index"
  sudo cp -p "$target_file" "$backup_file"
  backup_index=$((backup_index + 1))

  if sudo python3 - "$target_file" <<'PY'
import re
import sys
from pathlib import Path

path = Path(sys.argv[1])
text = path.read_text()
domains = re.compile(r"(?:inquiry\.business|smartdial\.online)")


def matching_brace(value: str, opening: int) -> int:
    depth = 0
    quote = None
    escaped = False
    for index in range(opening, len(value)):
        char = value[index]
        if quote:
            if escaped:
                escaped = False
            elif char == "\\":
                escaped = True
            elif char == quote:
                quote = None
            continue
        if char in "'\"":
            quote = char
        elif char == "{":
            depth += 1
        elif char == "}":
            depth -= 1
            if depth == 0:
                return index
    raise ValueError(f"Unbalanced braces in {path}")


proxy_location = '''location / {
            proxy_pass http://127.0.0.1:8088;
            proxy_http_version 1.1;
            proxy_set_header Upgrade $http_upgrade;
            proxy_set_header Connection "upgrade";
            proxy_set_header Host $host;
            proxy_cache_bypass $http_upgrade;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto $scheme;
        }'''

server_pattern = re.compile(r"\bserver\s*\{")
replacements = []
for server_match in server_pattern.finditer(text):
    server_open = text.find("{", server_match.start())
    server_close = matching_brace(text, server_open)
    server_body = text[server_open + 1:server_close]
    if not domains.search(server_body):
        continue

    location_pattern = re.compile(r"\blocation\s*(?:=\s*)?/\s*\{")
    for location_match in location_pattern.finditer(server_body):
        location_open = server_open + 1 + server_body.find("{", location_match.start())
        location_close = matching_brace(text, location_open)
        replacements.append((location_match.start() + server_open + 1, location_close + 1, proxy_location))

if not replacements:
    raise SystemExit(f"No root location block found in matching Nginx config: {path}")

for start, end, replacement in sorted(replacements, reverse=True):
    text = text[:start] + replacement + text[end:]
path.write_text(text)
print(f"Updated {path}: {len(replacements)} root location block(s)")
PY
  then
    changed=$((changed + 1))
  else
    echo "Nginx rewrite failed; the original file remains in $backup_dir"
    exit 1
  fi
done

if [ "$changed" -eq 0 ]; then
  echo "No Nginx configuration was changed."
  exit 1
fi

if ! sudo nginx -t; then
  echo "Nginx validation failed. Restore from: $backup_dir"
  exit 1
fi

sudo systemctl reload nginx
echo "Nginx reloaded; backups saved in $backup_dir"
