#!/usr/bin/env python3
# -*- coding: utf-8 -*-

import requests
import json
import sys

# Fix encoding for Windows
if sys.platform == 'win32':
    import os
    os.environ['PYTHONIOENCODING'] = 'utf-8'

# Login
login_response = requests.post(
    'http://localhost:5051/api/auth/login',
    json={'email': 'contato.cainandesign@gmail.com', 'password': 'Horiy5252ho.'}
)

login_data = login_response.json()
token = login_data.get('token')

print(f"[OK] Token obtido: {token[:50]}...")

# Sincronizar instâncias
sync_response = requests.post(
    'http://localhost:5051/api/sync/uazapi-instances',
    headers={'Authorization': f'Bearer {token}'},
    json={}
)

sync_data = sync_response.json()

print(f"\n[RESULTADO] Sincronizacao:")
print(f"  Total: {sync_data.get('total')}")
print(f"  Sincronizadas: {sync_data.get('synced')}")
print(f"  Erros: {sync_data.get('errors')}")

if sync_data.get('synced') > 0:
    print(f"\n[SUCCESS] Sincronizacao bem-sucedida!")
else:
    print(f"\n[ERROR] Nenhuma instancia foi sincronizada")
    print(f"Erro: {sync_data}")
