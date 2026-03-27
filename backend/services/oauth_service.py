import requests
from config import Config


class OAuthProvider:
    def __init__(self, client_id, client_secret, redirect_uri):
        self.client_id = client_id
        self.client_secret = client_secret
        self.redirect_uri = redirect_uri

    def get_authorization_url(self, state, **kwargs):
        raise NotImplementedError

    def exchange_code(self, code, **kwargs):
        raise NotImplementedError

    def get_user_info(self, access_token):
        raise NotImplementedError


class GoogleOAuthProvider(OAuthProvider):
    AUTHORIZATION_ENDPOINT = 'https://accounts.google.com/o/oauth2/v2/auth'
    TOKEN_ENDPOINT = 'https://oauth2.googleapis.com/token'
    USERINFO_ENDPOINT = 'https://openidconnect.googleapis.com/v1/userinfo'

    def get_authorization_url(self, state, **kwargs):
        params = {
            'client_id': self.client_id,
            'response_type': 'code',
            'scope': 'openid email profile',
            'redirect_uri': self.redirect_uri,
            'state': state,
        }
        return self.AUTHORIZATION_ENDPOINT + '?' + '&'.join(f"{k}={v}" for k, v in params.items())

    def exchange_code(self, code):
        data = {
            'code': code,
            'client_id': self.client_id,
            'client_secret': self.client_secret,
            'redirect_uri': self.redirect_uri,
            'grant_type': 'authorization_code',
        }
        response = requests.post(self.TOKEN_ENDPOINT, data=data)
        response.raise_for_status()
        return response.json()

    def get_user_info(self, access_token):
        headers = {'Authorization': f'Bearer {access_token}'}
        response = requests.get(self.USERINFO_ENDPOINT, headers=headers)
        response.raise_for_status()
        data = response.json()
        return {
            'id': data.get('sub'),
            'email': data.get('email'),
            'name': data.get('name'),
            'picture': data.get('picture'),
            'email_verified': data.get('email_verified', False),
        }


class GitHubOAuthProvider(OAuthProvider):
    AUTHORIZATION_ENDPOINT = 'https://github.com/login/oauth/authorize'
    TOKEN_ENDPOINT = 'https://github.com/login/oauth/access_token'
    USERINFO_ENDPOINT = 'https://api.github.com/user'

    def get_authorization_url(self, state, **kwargs):
        params = {
            'client_id': self.client_id,
            'redirect_uri': self.redirect_uri,
            'scope': 'user:email',
            'state': state,
        }
        return self.AUTHORIZATION_ENDPOINT + '?' + '&'.join(f"{k}={v}" for k, v in params.items())

    def exchange_code(self, code):
        data = {
            'client_id': self.client_id,
            'client_secret': self.client_secret,
            'code': code,
            'redirect_uri': self.redirect_uri,
        }
        headers = {'Accept': 'application/json'}
        response = requests.post(self.TOKEN_ENDPOINT, data=data, headers=headers)
        response.raise_for_status()
        return response.json()

    def get_user_info(self, access_token):
        headers = {
            'Authorization': f'Bearer {access_token}',
            'Accept': 'application/vnd.github+json',
        }
        response = requests.get(self.USERINFO_ENDPOINT, headers=headers)
        response.raise_for_status()
        data = response.json()
        return {
            'id': str(data.get('id')),
            'email': data.get('email'),
            'name': data.get('name'),
            'picture': data.get('avatar_url'),
            'email_verified': True,
        }


class OAuthService:
    def __init__(self):
        self.google = GoogleOAuthProvider(
            Config.GOOGLE_CLIENT_ID,
            Config.GOOGLE_CLIENT_SECRET,
            Config.GOOGLE_REDIRECT_URI,
        ) if Config.GOOGLE_CLIENT_ID and Config.GOOGLE_CLIENT_SECRET else None

        self.github = GitHubOAuthProvider(
            Config.GITHUB_CLIENT_ID,
            Config.GITHUB_CLIENT_SECRET,
            Config.GITHUB_REDIRECT_URI,
        ) if Config.GITHUB_CLIENT_ID and Config.GITHUB_CLIENT_SECRET else None

    def get_provider(self, provider_name):
        if provider_name == 'google':
            if not self.google:
                raise ValueError("Google OAuth not configured")
            return self.google
        elif provider_name == 'github':
            if not self.github:
                raise ValueError("GitHub OAuth not configured")
            return self.github
        else:
            raise ValueError(f"Unknown provider: {provider_name}")

    def get_authorization_url(self, provider, state):
        return self.get_provider(provider).get_authorization_url(state)

    def exchange_code(self, provider, code):
        provider_obj = self.get_provider(provider)
        token_response = provider_obj.exchange_code(code)
        if 'error' in token_response:
            raise Exception(f"Token exchange failed: {token_response.get('error_description')}")
        return token_response

    def get_user_info(self, provider, access_token):
        return self.get_provider(provider).get_user_info(access_token)


_oauth_service = None


def get_oauth_service():
    global _oauth_service
    if _oauth_service is None:
        _oauth_service = OAuthService()
    return _oauth_service
