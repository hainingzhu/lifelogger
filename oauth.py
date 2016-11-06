"""
Hongjian
10/10/2016

Oauth script for Moves app.
"""


from flask_oauthlib.client import OAuth
from base64 import b64encode


def get_oauth_credential():
    credentials = {}
    with open("oauth_credentials") as fin:
        credentials["moves_client_id"] = fin.readline().strip()
        credentials["moves_client_secret"] = fin.readline().strip()
        credentials["rescuetime_client_id"] = fin.readline().strip()
        credentials["rescuetime_client_secret"] = fin.readline().strip()
        credentials["fitbit_client_id"] = fin.readline().strip()
        credentials["fitbit_client_secret"] = fin.readline().strip()
    return credentials
    

credentials = get_oauth_credential()
    

def moves_oauth_server(app=None):
    
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

    
def rescuetime_oauth_server(app=None):
    
    oauth = OAuth(app)
    rescuetime = oauth.remote_app(
        name="rescuetime",
        consumer_key=credentials["rescuetime_client_id"],
        consumer_secret=credentials["rescuetime_client_secret"],
        authorize_url="https://www.rescuetime.com/oauth/authorize",
        request_token_params={'scope':'time_data category_data productivity_data'},
        access_token_method="POST",
        access_token_url="https://www.rescuetime.com/oauth/token",
        access_token_params={"client_id":credentials["rescuetime_client_id"],
                             "client_secret":credentials["rescuetime_client_secret"],
                                "expires_in": 31557600 }
        )
    return rescuetime
    

def fitbit_oauth_server(app=None):
    
    oauth = OAuth(app)
    fitbit = oauth.remote_app(
        name='fitbit',
        consumer_key=credentials['fitbit_client_id'],
        consumer_secret=credentials['fitbit_client_secret'],
        access_token_method='POST',
        access_token_url='https://api.fitbit.com/oauth2/token',
        request_token_params={'scope':'activity heartrate sleep',
                              'expires_in': 31536000},
        access_token_params={'client_id':credentials['fitbit_client_id']},
        access_token_headers=authorizationHeader(),
        authorize_url='https://www.fitbit.com/oauth2/authorize'
    )
    return fitbit
    
    
def authorizationHeader():
    """
    Fitbit Oauth API needs this extra tweak
    """
    auth_val = 'Basic '+ \
            b64encode("{0}:{1}".format(credentials['fitbit_client_id'], credentials['fitbit_client_secret']))
    return {'Authorization': auth_val}