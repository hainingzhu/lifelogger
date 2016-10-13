"""
Hongjian
10/10/2016

Oauth script for Moves app.
"""


from flask_oauthlib.client import OAuth


def get_moves_oauth_credential():
    credentials = {}
    with open("oauth_credentials") as fin:
        credentials["moves_client_id"] = fin.readline().strip()
        credentials["moves_client_secret"] = fin.readline().strip()
    return credentials
    
    
def moves_oauth_server(app=None):
    credentials = get_moves_oauth_credential()
    
    oauth = OAuth(app)
    moves = oauth.remote_app(
        name="moves",
        consumer_key=credentials["moves_client_id"],
        consumer_secret=credentials["moves_client_secret"],
        authorize_url="https://api.moves-app.com/oauth/v1/authorize",
        request_token_params={'scope': "activity location"},
        access_token_method="POST",
        access_token_url="https://api.moves-app.com/oauth/v1/access_token",
        access_token_params={"client_id":credentials["moves_client_id"],
                                "client_secret":credentials["moves_client_secret"]}
        )
    return moves
