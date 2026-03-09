from datetime import timedelta

# ...existing code...

SIMPLE_JWT = {
    'ACCESS_TOKEN_LIFETIME': timedelta(minutes=5),
    # you can add other options here, for example:
    # 'REFRESH_TOKEN_LIFETIME': timedelta(days=1),
    # 'ALGORITHM': 'HS256',
    # 'SIGNING_KEY': SECRET_KEY,
}

# ...existing code...