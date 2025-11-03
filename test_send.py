#!/usr/bin/env python3
# -*- coding: utf-8 -*-

import requests
import json

# 1. Login
print("[1] Fazendo login...")
login_resp = requests.post('http://localhost:5051/api/auth/login',
    json={'email': 'contato.cainandesign@gmail.com', 'password': 'Horiy5252ho.'}
)
token = login_resp.json().get('token')
print(f"[OK] Token obtido")

# 2. Testar envio de mensagem
print("\n[2] Testando envio de mensagem...")
send_resp = requests.post('http://localhost:5051/api/whatsapp/send-message',
    headers={'Authorization': f'Bearer {token}'},
    json={
        'instanceNumber': '5584987168184',
        'recipientNumber': '558498973484',
        'text': 'Teste de mensagem'
    }
)

result = send_resp.json()
print(f"Status HTTP: {send_resp.status_code}")
print(f"\nResposta completa:")
print(json.dumps(result, indent=2, ensure_ascii=False))

if send_resp.status_code == 200:
    print("\n[SUCCESS] Mensagem enviada!")
else:
    print(f"\n[ERROR] Falhou: {result.get('error')}")
