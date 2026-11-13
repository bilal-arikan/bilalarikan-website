#!/usr/bin/env bash
set -euo pipefail
directory=/var/www/.bilalarikan-tls
install -d -m 700 "$directory"
if [[ ! -f "$directory/origin.key" ]]; then
    umask 077
    openssl genpkey -algorithm RSA -pkeyopt rsa_keygen_bits:2048 -out "$directory/origin.key" 2>/dev/null
fi
openssl req -new -key "$directory/origin.key" -out "$directory/origin.csr" \
    -subj '/CN=bilalarikan.com' \
    -addext 'subjectAltName=DNS:bilalarikan.com,DNS:www.bilalarikan.com'
openssl req -in "$directory/origin.csr" -noout -verify
cat "$directory/origin.csr"
