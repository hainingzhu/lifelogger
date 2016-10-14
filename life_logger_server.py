"""
Hongjian Wang
10/12/2016

Lifelogger server.

Retrieve data from the following services:
1. Moves
2. Rescue Time
3. Fitbit
"""


from flask import Flask, render_template, session, request, url_for, redirect
from oauth import moves_oauth_server
import requests


app = Flask(__name__)
app.secret_key = "lifelogger"

moves = moves_oauth_server(app)



@app.route("/home")
def index():
    return render_template("index.html")
    


@app.route("/moves")
def moves_login():
    print "Authentication on Moves server"
    return moves.authorize(callback="http://98.235.161.247:9293/moves_oauth_accept")
    

@app.route("/moves_oauth_accept")
def moves_oauth_accept():
    print request
    res = moves.authorized_response()
    if res is None:
        return "Access denied. Error message {0}".format(request.args["error"])
    else:
        session['moves_token'] = (res['access_token'])
        session['moves_user_id'] = res['user_id']
        session['moves_refresh_token'] = res['refresh_token']
        return "User ID: {0}. Access token {1}".format(res['user_id'], res['access_token'])
        

@moves.tokengetter
def get_moves_token(token=None):
    return session["moves_token"]


@app.route("/moves_places/<dateStr>")
def get_moves_places(dateStr):
    if 'moves_user_id' not in session:
        return redirect(url_for('moves'))
    else:
        url = "https://api.moves-app.com/api/1.1/user/places/daily/{0}?access_token={1}".format(
                dateStr, session['moves_token'])
        print url
        return requests.get(url).content



if __name__ == '__main__':
    app.run(host="0.0.0.0", port=8081, debug=True)